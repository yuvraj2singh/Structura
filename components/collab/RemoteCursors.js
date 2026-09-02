"use client";
import { useEffect, useState } from "react";
import useCollabStore from "@/store/useCollabStore";
import useCanvasStore from "@/store/useCanvasStore";
import { getInitials } from "@/lib/utils";

/**
 * RemoteCursors
 * Renders other users' cursors as SVG pointers with name tags.
 * Positioned in screen-space (uses pan/zoom transform to convert canvas→screen).
 */
export default function RemoteCursors() {
  const [users, setUsers] = useState([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Re-render when remote users change
    const unsub = useCollabStore.subscribe((state) => {
      setUsers(Object.values(state.remoteUsers));
    });
    return unsub;
  }, []);

  if (!users.length) return null;

  return (
    <div
      id="remote-cursors"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {users.map((user) =>
        user.cursor ? (
          <RemoteCursor key={user.socketId} user={user} />
        ) : null
      )}
    </div>
  );
}

function RemoteCursor({ user }) {
  const { pan, zoom } = useCanvasStore.getState();
  const [transform, setTransform] = useState({ pan, zoom });

  useEffect(() => {
    // Sync viewport transform for accurate cursor position
    return useCanvasStore.subscribe((s) =>
      setTransform({ pan: s.pan, zoom: s.zoom })
    );
  }, []);

  if (!user.cursor) return null;

  // Convert canvas coords to screen coords
  const sx = user.cursor.x * transform.zoom + transform.pan.x;
  const sy = user.cursor.y * transform.zoom + transform.pan.y;
  const color = user.userColor || "#6366f1";
  const name  = user.userName || "Anonymous";

  return (
    <div
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
        transition: "left 60ms linear, top 60ms linear",
        zIndex: 50,
      }}
    >
      {/* Cursor SVG */}
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path
          d="M0 0L0 18L5 13L8.5 21L11 20L7.5 12H14L0 0Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Name tag */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 12,
          background: color,
          color: "white",
          fontSize: "0.7rem",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          padding: "2px 7px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          userSelect: "none",
        }}
      >
        {name}
      </div>
    </div>
  );
}

/**
 * CollaboratorAvatars
 * Shows avatar pills in the board nav for each connected user.
 */
export function CollaboratorAvatars({ max = 5 }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const update = () => setUsers(useCollabStore.getState().getAllUsers());
    update();
    return useCollabStore.subscribe(update);
  }, []);

  if (!users.length) return null;

  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }} id="collaborator-avatars">
      {visible.map((u, i) => (
        <div
          key={u.socketId}
          title={u.userName + (u.isLocal ? " (you)" : "")}
          style={{
            width: 28, height: 28,
            borderRadius: "50%",
            background: u.userColor || "#6366f1",
            border: `2px solid ${u.isLocal ? "var(--accent)" : "var(--bg-elevated)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.65rem", fontWeight: 700, color: "white",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: visible.length - i,
            position: "relative",
            boxShadow: "0 0 0 1px var(--bg-elevated)",
            cursor: "default",
            transition: "transform 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.zIndex = 99; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = visible.length - i; }}
        >
          {getInitials(u.userName || "A")}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-tertiary)", border: "2px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", marginLeft: -8 }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
