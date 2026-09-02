import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET      = process.env.JWT_SECRET ?? "dev-secret-change-in-prod";
const EXPIRES_IN  = process.env.JWT_EXPIRES_IN ?? "7d";
const COOKIE_NAME = process.env.COOKIE_NAME ?? "structura_token";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

/** Set auth cookie (server-side, in Route Handler) */
export async function setAuthCookie(response, token) {
  const options = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     "/",
  };

  if (response && response.cookies) {
    response.cookies.set(COOKIE_NAME, token, options);
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, options);
  } catch {
    // Handled by response.cookies
  }
}

/** Read auth token from request cookies */
export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/** Clear auth cookie */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Middleware-style helper — returns decoded user or null */
export async function getAuthUser() {
  const token = await getTokenFromCookies();
  if (!token) return null;
  return verifyToken(token);
}
