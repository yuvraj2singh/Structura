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
  if (!isOwner && !isCollab && board.shareMode === "private")
    return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, isOwner };
}

// PATCH /api/boards/:id/comments/:commentId — resolve, update text
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const body = await request.json().catch(() => ({}));
    const updates = {};
    if (typeof body.resolved === "boolean") updates.resolved = body.resolved;
    if (typeof body.text === "string" && body.text.trim()) updates.text = body.text.trim().slice(0, 2000);

    const comment = await Comment.findOneAndUpdate(
      { _id: p.commentId, board: p.id },
      { $set: updates },
      { new: true }
    ).populate("author", "name email avatar");

    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("[PATCH /comments/:id]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/boards/:id/comments/:commentId — add a reply
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { ok, status, error } = await canAccess(p.id, user.id);
    if (!ok) return NextResponse.json({ error }, { status });

    const body = await request.json().catch(() => ({}));
    if (!body.text?.trim()) return NextResponse.json({ error: "Reply text required" }, { status: 400 });

    const comment = await Comment.findOneAndUpdate(
      { _id: p.commentId, board: p.id },
      { $push: { replies: { author: user.id, text: body.text.trim().slice(0, 1000) } } },
      { new: true }
    ).populate("author replies.author", "name email avatar");

    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("[POST /comments/:id/reply]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/boards/:id/comments/:commentId
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const comment = await Comment.findOne({ _id: p.commentId, board: p.id });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const isAuthor = String(comment.author) === String(user.id);
    const { isOwner } = await canAccess(p.id, user.id);
    if (!isAuthor && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await comment.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /comments/:id]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
