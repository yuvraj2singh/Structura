"use client";
/**
 * useSocket — manages the Socket.IO connection lifecycle for a board session.
 *
 * Usage:
 *   const { socket, connected } = useSocket({ boardId, user });
 *
 * Handles:
 *  - Connect / reconnect on boardId change
 *  - Join board room
 *  - Receive remote element ops → apply to canvasStore
 *  - Receive cursor updates → apply to collabStore
 *  - Broadcast local element changes (call socket.emit from canvas)
 *  - Clean disconnect on unmount
 */
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import useCanvasStore from "@/store/useCanvasStore";
import useCollabStore from "@/store/useCollabStore";
import { generateId, stringToColor } from "@/lib/utils";

const SOCKET_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let sharedSocket = null; // singleton socket across hot-reloads in dev

export function useSocket({ boardId, user }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  // Track which element updates we sent so we don't echo them back
  const sentOpsRef = useRef(new Set());

  const collab = useCollabStore.getState;

  useEffect(() => {
    if (!boardId || typeof window === "undefined") return;

    const userColor = user?.color ?? stringToColor(user?.name ?? "anon");

    // Reuse existing socket if already connected
    if (!sharedSocket || sharedSocket.disconnected) {
      sharedSocket = io(SOCKET_URL, {
        query: {
          boardId,
          userId:    user?.id    ?? `anon-${generateId("u")}`,
          userName:  user?.name  ?? "Anonymous",
          userColor,
        },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = sharedSocket;
    socketRef.current = socket;

    // ── Connection events ─────────────────────────
    socket.on("connect", () => {
      setConnected(true);
      useCollabStore.getState().setConnected(true, socket.id);
      useCollabStore.getState().setLocalUser({ id: user?.id, name: user?.name, color: userColor });

      // Join the board room
      socket.emit("board:join", { boardId });
      console.log("[Socket] Connected:", socket.id);
    });

    // If socket is already connected (hot-reload, existing singleton),
    // the "connect" event won't fire again — handle it explicitly
    if (socket.connected) {
      setConnected(true);
      useCollabStore.getState().setConnected(true, socket.id);
      useCollabStore.getState().setLocalUser({ id: user?.id, name: user?.name, color: userColor });
      socket.emit("board:join", { boardId });
      console.log("[Socket] Already connected — rejoined board:", boardId);
    }

    socket.on("disconnect", () => {
      setConnected(false);
      useCollabStore.getState().setConnected(false, null);
      console.log("[Socket] Disconnected");
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      setConnected(false);
    });

    // ── Board state (sent on join) ────────────────
    socket.on("board:state", ({ elements, users }) => {
      // Only load remote elements if canvas is empty (avoid overwrite)
      if (elements?.length && useCanvasStore.getState().elements.length === 0) {
        useCanvasStore.getState().setElements(elements);
      }
      if (users) useCollabStore.getState().setInitialUsers(users);
    });

    // ── Remote user presence ──────────────────────
    socket.on("user:joined", (user) => {
      useCollabStore.getState().addRemoteUser(user);
    });

    socket.on("user:left", ({ socketId }) => {
      useCollabStore.getState().removeRemoteUser(socketId);
    });

    // ── Remote cursor updates ─────────────────────
    socket.on("cursor:update", ({ socketId, userId, userName, userColor, x, y }) => {
      useCollabStore.getState().updateCursor(socketId, x, y);
      // Ensure user record exists (might have joined before we connected)
      if (!useCollabStore.getState().remoteUsers[socketId]) {
        useCollabStore.getState().addRemoteUser({ socketId, userId, userName, userColor });
      }
    });

    // ── Remote element operations ─────────────────
    socket.on("element:add", ({ elements, senderId }) => {
      if (senderId === socket.id) return; // echo guard
      useCanvasStore.getState().addElements(elements);
    });

    socket.on("element:update", ({ id, updates, senderId }) => {
      if (senderId === socket.id) return;
      useCanvasStore.getState().updateElement(id, updates);
    });

    socket.on("element:delete", ({ ids, senderId }) => {
      if (senderId === socket.id) return;
      useCanvasStore.getState().deleteElements(ids);
    });

    socket.on("element:batch", ({ elements, senderId }) => {
      if (senderId === socket.id) return;
      useCanvasStore.getState().setElements(elements);
    });

    // Connect if not already
    if (!socket.connected) socket.connect();

    return () => {
      // Remove listeners but keep socket alive (singleton)
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("board:state");
      socket.off("user:joined");
      socket.off("user:left");
      socket.off("cursor:update");
      socket.off("element:add");
      socket.off("element:update");
      socket.off("element:delete");
      socket.off("element:batch");
    };
  }, [boardId, user?.id]);

  return { socket: socketRef.current, connected };
}

/** Throttled cursor broadcast — call from Canvas.onPointerMove */
export function broadcastCursor(socket, x, y) {
  if (!socket?.connected) return;
  socket.emit("cursor:move", { x, y });
}

/** Broadcast element add */
export function broadcastElementAdd(socket, elements) {
  if (!socket?.connected) return;
  socket.emit("element:add", { elements: Array.isArray(elements) ? elements : [elements] });
}

/** Broadcast element update */
export function broadcastElementUpdate(socket, id, updates) {
  if (!socket?.connected) return;
  socket.emit("element:update", { id, updates });
}

/** Broadcast element delete */
export function broadcastElementDelete(socket, ids) {
  if (!socket?.connected) return;
  socket.emit("element:delete", { ids: Array.isArray(ids) ? ids : [ids] });
}

/** Broadcast full canvas replace (after AI generation) */
export function broadcastBatch(socket, elements) {
  if (!socket?.connected) return;
  socket.emit("element:batch", { elements });
}
