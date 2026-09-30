// src/lib/auth/startSession.ts
// Starts a signed-in session on a response. Every way of signing in
// (password, Google, account linking, new-device code) ends here, so the
// sessions they create are identical:
//  - a SessionCache entry holding the hash of a random session token
//  - the raw token in the httpOnly `sessionId` cookie
//  - a short-lived `session_jwt` for src/proxy.ts
//  - the user's tokenVersion cached in Redis for the proxy's revocation check
//  - a LoginEvent row for the login history in settings
import type { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import type { IUser } from "@/lib/models/userModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { getLoginContext } from "@/lib/auth/loginContext";
import { getLoginEventModel, type LoginMethod } from "@/lib/models/loginEventModel";
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

export type SessionSubject = Pick<
  IUser,
  | "email"
  | "fullName"
  | "role"
  | "school"
  | "faculty"
  | "department"
  | "level"
  | "upid"
  | "isVerified"
  | "profilePhoto"
  | "tokenVersion"
> & { _id: Types.ObjectId | string };

export interface HowSignedIn {
  method: LoginMethod;
  /** Confirmed with an emailed code (new device, or linking Google). */
  viaEmailCode?: boolean;
}

export async function startSession(
  request: NextRequest,
  response: NextResponse,
  user: SessionSubject,
  how: HowSignedIn,
): Promise<void> {
  const userId = String(user._id);
  const tokenVersion = user.tokenVersion ?? 0;
  const rawToken = generateToken();
  const client = getLoginContext(request);

  const SessionCache = await getSessionCacheModel();
  const session = await SessionCache.createFullSession(
    userId,
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
      tokenVersion,
    },
    rawToken,
    SESSION_TTL_HOURS,
    client,
  );

  try {
    const LoginEvent = await getLoginEventModel();
    await LoginEvent.create({
      userId,
      sessionUuid: session.uuid,
      method: how.method,
      viaEmailCode: how.viaEmailCode === true,
      ...client,
    });
  } catch (error) {
    // History is informational; never fail a sign-in over it
    console.error("startSession: failed to record login event", error);
  }

  // The proxy compares JWTs against this (src/proxy.ts)
  await cacheTokenVersion(userId, tokenVersion);

  response.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions());
  // Short-lived access token for src/proxy.ts (renewed via /api/auth/refresh)
  response.cookies.set(
    SESSION_JWT_COOKIE,
    await signSessionJwt({ sub: userId, role: user.role, upid: user.upid, tokenVersion }),
    sessionJwtCookieOptions(),
  );
}

/**
 * Only same-site paths, never "//evil.com", absolute URLs, backslash tricks
 * (browsers treat "/\" like "//") or the auth pages themselves.
 */
export function safeReturnPath(value: string | null | undefined): string {
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
