import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Create user (pre-save hook will hash the password)
    const user = await User.create({ name, email, passwordHash: password });

    const token = signToken({ id: user._id, email: user.email });
    const response = NextResponse.json({ user: user.toPublic() }, { status: 201 });
    await setAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
