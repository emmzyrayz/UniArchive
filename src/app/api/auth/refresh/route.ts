// GET /api/auth/refresh?from=/some/page
// Used by src/proxy.ts when the 15-minute session_jwt has expired. Checks the
// long-lived database session, issues a fresh JWT and redirects back. With no
// valid session it clears both cookies and redirects to sign-in.
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import {
  SESSION_JWT_COOKIE,
  sessionJwtCookieOptions,
  signSessionJwt,
} from "@/lib/auth/jwt";

// Only same-site relative paths, never "//evil.com" or absolute URLs
function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/home";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const from = safeReturnPath(request.nextUrl.searchParams.get("from"));
  const user = await getCurrentSessionUser(request);

  if (!user) {
    const signIn = new URL("/auth", request.url);
    signIn.searchParams.set("view", "signin");
    signIn.searchParams.set("from", from);
    const response = NextResponse.redirect(signIn);
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
    return response;
  }

  const jwt = await signSessionJwt({ sub: user.userId, role: user.role, upid: user.upid });
  const response = NextResponse.redirect(new URL(from, request.url));
  response.cookies.set(SESSION_JWT_COOKIE, jwt, sessionJwtCookieOptions());
  return response;
}
