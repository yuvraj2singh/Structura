import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import BoardVersion from "@/models/BoardVersion";
import { getAuthUser } from "@/lib/auth/jwt";
import { updateBoardSchema } from "@/lib/validation/board";
import { generateVersionName } from "@/lib/ai/versionNaming";

async function getBoard(id, userId) {
  const board = await Board.findById(id);
  if (!board) return { board: null, error: "Board not found", status: 404 };
  const isOwner = String(board.owner) === String(userId);
  const isCollaborator = board.collaborators.some(c => String(c.user) === String(userId));
  if (!isOwner && !isCollaborator && board.shareMode === "private") {
    return { board: null, error: "Forbidden", status: 403 };
  }
  return { board, isOwner };
}

// GET /api/boards/:id
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { board, error, status } = await getBoard(p.id, user.id);
    if (error) return NextResponse.json({ error }, { status });

    return NextResponse.json({ board });
  } catch (err) {
    console.error("[GET /api/boards/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/boards/:id — update title, elements, shareMode
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const body = await request.json();
    const parsed = updateBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const { board, error, status } = await getBoard(p.id, user.id);
    if (error) return NextResponse.json({ error }, { status });

    // Store state snapshot only when elements have actually changed
    if (parsed.data.elements) {
      const newJson = JSON.stringify(parsed.data.elements);
      const oldJson = JSON.stringify(board.elements || []);

      if (newJson !== oldJson) {
        // Check last version to prevent duplicate sequential snapshots
        const lastVersion = await BoardVersion.findOne({ board: board._id })
          .sort({ createdAt: -1 })
          .lean();

        const lastJson = lastVersion ? JSON.stringify(lastVersion.elements || []) : null;

        if (newJson !== lastJson) {
          // Generate concise, human-readable name using Gemini AI
          const versionName = await generateVersionName({
            elements: parsed.data.elements,
            previousElements: board.elements || [],
            boardTitle: parsed.data.title || board.title,
          });

          await BoardVersion.create({
            board: board._id,
            elements: parsed.data.elements,
            createdBy: user.id,
            auto: true,
            label: versionName,
          }).catch((e) => console.warn("[VersionSnapshot]", e.message));

          // Keep clean history — prune old auto-saves beyond 50
          const autoCount = await BoardVersion.countDocuments({ board: board._id, auto: true });
          if (autoCount > 50) {
            const oldest = await BoardVersion.find({ board: board._id, auto: true })
              .sort({ createdAt: 1 })
              .limit(autoCount - 50)
              .lean();
            if (oldest.length) {
              await BoardVersion.deleteMany({ _id: { $in: oldest.map((o) => o._id) } });
            }
          }
        }
      }
    }

    // Use findByIdAndUpdate + $set to avoid Mongoose VersionError when
    // two browser tabs auto-save the same document concurrently
    const updated = await Board.findByIdAndUpdate(
      p.id,
      { $set: parsed.data },
      { returnDocument: "after", runValidators: false }
    );

    return NextResponse.json({ board: updated });
  } catch (err) {
    console.error("[PATCH /api/boards/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/boards/:id
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();
    const { board, error, status, isOwner } = await getBoard(p.id, user.id);
    if (error) return NextResponse.json({ error }, { status });
    if (!isOwner) return NextResponse.json({ error: "Only the owner can delete a board" }, { status: 403 });

    await Board.findByIdAndDelete(p.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/boards/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
