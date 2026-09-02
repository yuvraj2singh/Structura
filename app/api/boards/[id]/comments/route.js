import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Comment from "@/models/Comment";
import { getAuthUser } from "@/lib/auth/jwt";

async function canAccess(boardId, userId) {
  const board = await Board.findById(boardId).lean();
  if (!board) return { ok: false, status: 404, error: "Board not found" };
  const isOwner = String(board.owner) === String(userId);
  const isCollab = board.collaborators?.some((c) => String(c.user) === String(userId));
  if (!isOwner && !isCollab && board.shareMode === "private") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, isOwner };
}

// GET /api/boards/:id/comments — list all comments for a board
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const comments = await Comment.find({ board: p.id, resolved: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate("author", "name email avatar")
      .populate("replies.author", "name email avatar")
      .lean();

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("[GET /comments]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/boards/:id/comments — create a new comment
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const body = await request.json();
    const { text, x, y, elementId } = body;

    if (!text?.trim()) return NextResponse.json({ error: "Comment text is required" }, { status: 400 });

    const comment = await Comment.create({
      board: p.id,
      author: user.id,
      text: text.trim().slice(0, 1000),
      x: Number(x) || 0,
      y: Number(y) || 0,
      elementId: elementId || null,
      replies: [],
      resolved: false,
    });

    await comment.populate("author", "name email avatar");

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("[POST /comments]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
