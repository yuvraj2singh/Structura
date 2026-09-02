import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import BoardVersion from "@/models/BoardVersion";
import { getAuthUser } from "@/lib/auth/jwt";

// POST /api/boards/:id/versions/:versionId — restore a version
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();

    const board = await Board.findById(p.id);
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const isOwner = String(board.owner) === String(user.id);
    const isCollab = board.collaborators?.some((c) => String(c.user) === String(user.id));
    if (!isOwner && !isCollab && board.shareMode === "private") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const version = await BoardVersion.findOne({ _id: p.versionId, board: p.id });
    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // Snapshot current state before restoring (so you can undo the restore)
    await BoardVersion.create({
      board: board._id,
      elements: board.elements,
      createdBy: user.id,
      auto: true,
      label: `Before restore to ${version.label || new Date(version.createdAt).toLocaleString()}`,
    });

    // Restore
    board.elements = version.elements;
    board.updatedAt = new Date();
    await board.save();

    return NextResponse.json({
      ok: true,
      elements: board.elements,
      restoredFrom: version._id,
    });
  } catch (err) {
    console.error("[POST /api/boards/:id/versions/:versionId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/boards/:id/versions/:versionId — delete a specific version
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();

    const board = await Board.findById(p.id).lean();
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
    if (String(board.owner) !== String(user.id)) {
      return NextResponse.json({ error: "Only owner can delete versions" }, { status: 403 });
    }

    await BoardVersion.findOneAndDelete({ _id: p.versionId, board: p.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/boards/:id/versions/:versionId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
