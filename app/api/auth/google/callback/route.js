import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    console.error("[Google OAuth Error]", error || "No code provided");
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[Google Token Exchange Failed]", tokenData);
      return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    // 2. Fetch user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) {
      console.error("[Google Profile Fetch Failed]", profile);
      return NextResponse.redirect(`${appUrl}/login?error=profile_fetch_failed`);
    }

    // 3. Connect to MongoDB and find or create user
    await connectDB();

    let user = await User.findOne({
      $or: [{ googleId: profile.id }, { email: profile.email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        avatar: profile.picture || null,
        provider: "google",
        googleId: profile.id,
        isVerified: true,
      });
    } else {
      // Update Google ID and avatar if needed
      let changed = false;
      if (!user.googleId) {
        user.googleId = profile.id;
        changed = true;
      }
      if (!user.avatar && profile.picture) {
        user.avatar = profile.picture;
        changed = true;
      }
      if (changed) await user.save();
    }

    // 4. Issue JWT and set cookie
    const token = signToken({ id: user._id, email: user.email });
    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    await setAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error("[Google OAuth Callback Error]", err);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message || "server_error")}`);
  }
}
