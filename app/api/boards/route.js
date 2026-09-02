import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import { getAuthUser } from "@/lib/auth/jwt";
import { createBoardSchema } from "@/lib/validation/board";

// GET /api/boards — list boards for current user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const boards = await Board.find({
      $or: [
        { owner: user.id },
        { "collaborators.user": user.id },
      ],
      isArchived: false,
    })
      .select("-elements")  // don't send full canvas data on list
      .sort({ updatedAt: -1 })
      .limit(100);

    return NextResponse.json({ boards });
  } catch (err) {
    console.error("[GET /api/boards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/boards — create new board
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const board = await Board.create({ owner: user.id, ...parsed.data });

    return NextResponse.json({ board }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/boards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
