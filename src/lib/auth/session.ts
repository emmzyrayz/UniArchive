// src/lib/auth/session.ts
// Server-side session helpers for route handlers.
//
// The browser holds the RAW session token in the httpOnly `sessionId` cookie;
// the database stores only its hash. The user's role is re-read from the User
// document on every request so a role change or demotion applies immediately
// instead of waiting for the session to expire.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { getUserModel } from "@/lib/models/userModel";
import { can, type Action } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/roles";

export const SESSION_COOKIE = "sessionId";
export const SESSION_TTL_HOURS = 24 * 7;
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionUser {
  userId: string;
  upid: string;
  role: UserRole;
  uuid: string;
  isVerified: boolean;
  fullName: string;
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_HOURS * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: sent on top-level navigations from other sites (email links),
    // still withheld from cross-site POSTs and subresource requests.
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function readSessionToken(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Tokens are 32 random bytes as hex; reject anything else before touching the DB.
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

// Returns the session user or null
export async function getCurrentSessionUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  return getSessionUserByToken(readSessionToken(request));
}

/**
 * Resolves a raw session token (already format-checked) to its user. Server
 * components read the cookie themselves and come in here.
 */
export async function getSessionUserByToken(
  rawToken: string | null | undefined,
): Promise<SessionUser | null> {
  if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) return null;

  try {
    const SessionCache = await getSessionCacheModel();
    const session = await SessionCache.findActiveSession(rawToken, "sessionToken");
    if (!session) return null;

    const User = await getUserModel();
    const user = await User.findById(session.userId)
      .select("role upid uuid isVerified fullName")
      .lean();
    if (!user) return null;

    if (Date.now() - session.lastActivity.getTime() > ACTIVITY_WRITE_INTERVAL_MS) {
      void SessionCache.updateActivity(rawToken);
    }

    return {
      userId: String(user._id),
      upid: user.upid,
      role: user.role,
      uuid: user.uuid,
      isVerified: user.isVerified,
      fullName: user.fullName,
    };
  } catch (error) {
    console.error("Session lookup failed:", error);
    return null;
  }
}

// Throws a 401 Response if not authenticated
export async function requireAuth(request: NextRequest): Promise<SessionUser> {
  const user = await getCurrentSessionUser(request);
  if (!user) {
    throw NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  return user;
}

// Throws 403 if user doesn't have one of the required roles
export async function requireRole(
  request: NextRequest,
  roles: UserRole[],
): Promise<SessionUser> {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) {
    throw NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return user;
}

// Throws 403 if user can't perform the action
export async function requirePermission(
  request: NextRequest,
  action: Extract<
    Action,
    | "upload"
    | "moderate"
    | "admin"
    | "delete"
    | "edit"
    | "audit"
    | "verify"
    | "teach"
    | "create_course"
    | "admin.view_submissions"
    | "submission.review"
    | "submission.verify_tier1"
    | "submission.verify_tier2"
    | "submission.reject"
  >,
): Promise<SessionUser> {
  const user = await requireAuth(request);
  if (!can(user.role, action)) {
    throw NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return user;
}
