import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth/jwt";

export async function GET() {
  try {
    const decoded = await getAuthUser();
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: user.toPublic() });
  } catch (err) {
    console.error("[Me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
