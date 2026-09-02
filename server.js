/**
 * Custom server.js — wraps Next.js with Socket.IO
 * Run with: node server.js  (or npm run dev:server)
 *
 * In dev, this replaces `next dev`.
 * In production, use `next build` then `node server.js`.
 */

const { createServer } = require("http");
const { Server }       = require("socket.io");
const next             = require("next");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

// ── In-memory rooms ───────────────────────────────
// boardId → { users: Map<socketId, UserInfo>, elements: [] }
const rooms = new Map();

function getRoom(boardId) {
  if (!rooms.has(boardId)) {
    rooms.set(boardId, { users: new Map(), elements: [] });
  }
  return rooms.get(boardId);
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // ── Middleware: attach user info from auth header / query ──
  io.use((socket, next) => {
    const { userId, userName, userColor, boardId } = socket.handshake.query;
    socket.data.userId    = userId    || `anon-${socket.id.slice(0, 6)}`;
    socket.data.userName  = userName  || "Anonymous";
    socket.data.userColor = userColor || "#6366f1";
    socket.data.boardId   = boardId   || null;
    next();
  });

  io.on("connection", (socket) => {
    const { userId, userName, userColor, boardId } = socket.data;

    // ── JOIN BOARD ────────────────────────────────
    socket.on("board:join", ({ boardId: bid }) => {
      const id = bid || boardId;
      if (!id) return;
      socket.data.boardId = id;
      socket.join(id);

      const room = getRoom(id);
      room.users.set(socket.id, { socketId: socket.id, userId, userName, userColor, cursor: null, joinedAt: Date.now() });

      // Send current state to the new joiner
      socket.emit("board:state", {
        elements: room.elements,
        users: [...room.users.values()],
      });

      // Notify others
      socket.to(id).emit("user:joined", { socketId: socket.id, userId, userName, userColor });
      console.log(`[Socket] ${userName} joined board ${id}. Total: ${room.users.size}`);
    });

    // ── CURSOR MOVE ───────────────────────────────
    socket.on("cursor:move", ({ x, y }) => {
      const bid = socket.data.boardId;
      if (!bid) return;
      const room = getRoom(bid);
      const user = room.users.get(socket.id);
      if (user) user.cursor = { x, y };
      // Broadcast to others only
      socket.to(bid).emit("cursor:update", {
        socketId: socket.id,
        userId,
        userName,
        userColor,
        x, y,
      });
    });

    // ── ELEMENT OPERATIONS ────────────────────────
    // element:add — one or many
    socket.on("element:add", ({ elements }) => {
      const bid = socket.data.boardId;
      if (!bid || !elements?.length) return;
      const room = getRoom(bid);
      room.elements.push(...elements);
      // Trim to prevent unbounded growth
      if (room.elements.length > 5000) room.elements = room.elements.slice(-5000);
      socket.to(bid).emit("element:add", { elements, senderId: socket.id });
    });

    // element:update — patch one element
    socket.on("element:update", ({ id, updates }) => {
      const bid = socket.data.boardId;
      if (!bid) return;
      const room = getRoom(bid);
      const idx = room.elements.findIndex((el) => el.id === id);
      if (idx !== -1) Object.assign(room.elements[idx], updates, { updatedAt: Date.now() });
      socket.to(bid).emit("element:update", { id, updates, senderId: socket.id });
    });

    // element:delete
    socket.on("element:delete", ({ ids }) => {
      const bid = socket.data.boardId;
      if (!bid || !ids?.length) return;
      const room = getRoom(bid);
      room.elements = room.elements.filter((el) => !ids.includes(el.id));
      socket.to(bid).emit("element:delete", { ids, senderId: socket.id });
    });

    // element:batch — full canvas replace (used after AI generation)
    socket.on("element:batch", ({ elements }) => {
      const bid = socket.data.boardId;
      if (!bid) return;
      const room = getRoom(bid);
      room.elements = elements || [];
      socket.to(bid).emit("element:batch", { elements: room.elements, senderId: socket.id });
    });

    // board:rename
    socket.on("board:rename", ({ title }) => {
      const bid = socket.data.boardId;
      if (!bid || !title) return;
      socket.to(bid).emit("board:rename", { title, senderId: socket.id });
    });

    // ── DISCONNECT ────────────────────────────────
    socket.on("disconnect", () => {
      const bid = socket.data.boardId;
      if (!bid) return;
      const room = getRoom(bid);
      room.users.delete(socket.id);
      socket.to(bid).emit("user:left", { socketId: socket.id, userId });
      console.log(`[Socket] ${userName} left board ${bid}. Remaining: ${room.users.size}`);
      // Cleanup empty rooms
      if (room.users.size === 0) rooms.delete(bid);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n🚀 Structura running at http://localhost:${port} [${dev ? "dev" : "prod"}]`);
    console.log(`   Socket.IO attached ✓\n`);
  });
});
