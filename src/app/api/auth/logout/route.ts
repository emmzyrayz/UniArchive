// POST /api/auth/logout
// Invalidates the current session and clears the cookie. Always succeeds from
// the client's point of view.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import {
  SESSION_COOKIE,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_JWT_COOKIE, sessionJwtCookieOptions } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const rawToken = readSessionToken(request);

  if (rawToken) {
    try {
      const SessionCache = await getSessionCacheModel();
      await SessionCache.invalidateSession(rawToken);
    } catch (error) {
      console.error("logout: failed to invalidate session", error);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
  return response;
}
