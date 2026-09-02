import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    await connectDB();

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signToken({ id: user._id, email: user.email });
    const response = NextResponse.json({ user: user.toPublic() });
    await setAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error("[Login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
