import { create } from "zustand";
import { stringToColor } from "@/lib/utils";

/**
 * Collaboration Store
 * Tracks: remote users, their cursors, and the Socket.IO connection state.
 * The actual socket instance lives in useSocket hook (to avoid SSR issues).
 */
const useCollabStore = create((set, get) => ({
  // Connection
  connected: false,
  socketId: null,
  boardId: null,

  // Local user
  localUser: {
    id: null,
    name: "You",
    color: "#6366f1",
  },

  // Remote users: Map<socketId, { socketId, userId, userName, userColor, cursor: {x,y} | null }>
  remoteUsers: {},

  // ── Actions ──────────────────────────────────────
  setConnected: (connected, socketId = null) => set({ connected, socketId }),

  setBoardId: (boardId) => set({ boardId }),

  setLocalUser: (user) =>
    set((s) => ({ localUser: { ...s.localUser, ...user } })),

  // Called when server sends full room state on join
  setInitialUsers: (users) => {
    const socketId = get().socketId;
    const map = {};
    for (const u of users) {
      if (u.socketId !== socketId) map[u.socketId] = u;
    }
    set({ remoteUsers: map });
  },

  // A new user connected
  addRemoteUser: (user) =>
    set((s) => ({
      remoteUsers: { ...s.remoteUsers, [user.socketId]: { ...user, cursor: null } },
    })),

  // A user disconnected
  removeRemoteUser: (socketId) =>
    set((s) => {
      const next = { ...s.remoteUsers };
      delete next[socketId];
      return { remoteUsers: next };
    }),

  // Update a remote user's cursor position
  updateCursor: (socketId, x, y) =>
    set((s) => ({
      remoteUsers: {
        ...s.remoteUsers,
        [socketId]: { ...(s.remoteUsers[socketId] || {}), cursor: { x, y } },
      },
    })),

  clearCursor: (socketId) =>
    set((s) => ({
      remoteUsers: {
        ...s.remoteUsers,
        [socketId]: { ...(s.remoteUsers[socketId] || {}), cursor: null },
      },
    })),

  // Helpers
  getRemoteUsersArray: () => Object.values(get().remoteUsers),
  getAllUsers: () => {
    const { localUser, remoteUsers } = get();
    return [
      { socketId: "local", userId: localUser.id, userName: localUser.name, userColor: localUser.color, isLocal: true },
      ...Object.values(remoteUsers),
    ];
  },
}));

export default useCollabStore;
