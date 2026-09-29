// GET /api/auth/social-callback?from=/some/page
// Where Auth.js sends the browser after Google sign-in. Reads the short-lived
// Auth.js session, starts one of our own sessions exactly like
// /api/auth/login (SessionCache entry, `sessionId` + `session_jwt` cookies,
// tokenVersion cache), deletes the Auth.js cookie and redirects on.
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/socialAuth";
import { getUserModel } from "@/lib/models/userModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { getClientIp, getDeviceInfo } from "@/lib/api";
import { generateToken } from "@/lib/auth/tokens";
import {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  SESSION_JWT_COOKIE,
  sessionJwtCookieOptions,
  signSessionJwt,
} from "@/lib/auth/jwt";
import { cacheTokenVersion } from "@/lib/auth/tokenVersionCache";

// Auth.js session cookie; large tokens are split into .0, .1, ... chunks
const AUTHJS_SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

// Only same-site relative paths, never "//evil.com", absolute URLs or /auth
function safeReturnPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value === "/auth" ||
    value.startsWith("/auth?") ||
    value.startsWith("/auth/")
  ) {
    return "/home";
  }
  return value;
}

function clearAuthJsSession(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!AUTHJS_SESSION_COOKIE.test(name)) continue;
    response.cookies.set(name, "", {
      httpOnly: true,
      // __Secure- cookies can only be overwritten by a Secure cookie
      secure: name.startsWith("__Secure-") || process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

function failure(request: NextRequest, error: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("view", "signin");
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  clearAuthJsSession(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const socialSession = await auth();
    const userId = socialSession?.user?.id;
    if (!userId) return failure(request, "oauth_failed");

    const User = await getUserModel();
    const user = await User.findById(userId);
    if (!user) return failure(request, "oauth_failed");
    // Checked again here: the account may have changed since the handshake
    if (user.isSuspended) return failure(request, "suspended");
    if (!user.isVerified) return failure(request, "oauth_failed");

    // Same session as /api/auth/login
    const rawToken = generateToken();
    const SessionCache = await getSessionCacheModel();
    await SessionCache.createFullSession(
      String(user._id),
      {
        email: decryptSensitiveData(user.email),
        fullName: user.fullName,
        role: user.role,
        school: user.school,
        faculty: user.faculty,
        department: user.department,
        level: user.level,
        upid: user.upid,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
        tokenVersion: user.tokenVersion ?? 0,
      },
      rawToken,
      SESSION_TTL_HOURS,
      getDeviceInfo(request),
      getClientIp(request),
    );

    // The proxy compares JWTs against this (src/proxy.ts)
    await cacheTokenVersion(String(user._id), user.tokenVersion ?? 0);

    const response = NextResponse.redirect(
      new URL(safeReturnPath(request.nextUrl.searchParams.get("from")), request.url),
    );
    response.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions());
    response.cookies.set(
      SESSION_JWT_COOKIE,
      await signSessionJwt({
        sub: String(user._id),
        role: user.role,
        upid: user.upid,
        tokenVersion: user.tokenVersion ?? 0,
      }),
      sessionJwtCookieOptions(),
    );
    // The Auth.js session has done its job; ours is the only one from here
    clearAuthJsSession(request, response);
    return response;
  } catch (error) {
    console.error("[social-callback] failed:", error);
    return failure(request, "oauth_failed");
  }
}
