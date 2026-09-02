import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import BoardVersion from "@/models/BoardVersion";
import { getAuthUser } from "@/lib/auth/jwt";

const MAX_AUTO_VERSIONS = 50; // keep last 50 auto-saves per board

async function canAccess(boardId, userId) {
  const board = await Board.findById(boardId).lean();
  if (!board) return { ok: false, status: 404, error: "Board not found" };
  const isOwner = String(board.owner) === String(userId);
  const isCollab = board.collaborators?.some((c) => String(c.user) === String(userId));
  if (!isOwner && !isCollab && board.shareMode === "private") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, board, isOwner };
}

// GET /api/boards/:id/versions — list versions (newest first)
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const versions = await BoardVersion.find({ board: p.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("createdBy", "name email avatar")
      .lean();

    return NextResponse.json({ versions });
  } catch (err) {
    console.error("[GET /api/boards/:id/versions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/boards/:id/versions — create a named manual snapshot
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error, board } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const body = await request.json().catch(() => ({}));
    const label = (body.label || "").trim().slice(0, 80) || "Manual snapshot";

    // Create named version from current board state
    const version = await BoardVersion.create({
      board: board._id,
      elements: board.elements,
      createdBy: user.id,
      auto: false,
      label,
      createdAt: new Date(),
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/boards/:id/versions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/boards/:id/versions — delete all versions or prune
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error, isOwner } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });
    if (!isOwner) return NextResponse.json({ error: "Only the board owner can delete version history" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const pruneOnly = searchParams.get("prune") === "true";

    if (pruneOnly) {
      // Find the oldest auto-saves beyond the limit and remove them
      const autoVersions = await BoardVersion.find({ board: p.id, auto: true })
        .sort({ createdAt: -1 })
        .lean();

      const toDelete = autoVersions.slice(MAX_AUTO_VERSIONS).map((v) => v._id);
      if (toDelete.length) await BoardVersion.deleteMany({ _id: { $in: toDelete } });

      return NextResponse.json({ pruned: toDelete.length });
    }

    // Delete all versions for this board
    const result = await BoardVersion.deleteMany({ board: p.id });
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("[DELETE /api/boards/:id/versions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
