// src/lib/auth/jwt.ts
// Short-lived access JWT used by src/proxy.ts for fast, database-free route
// checks. The long-lived source of truth is still the `sessionId` session;
// /api/auth/refresh re-issues this JWT from it. Keep this module free of
// Mongoose imports so the proxy stays lightweight.
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/roles";

export const SESSION_JWT_COOKIE = "session_jwt";
export const SESSION_JWT_TTL_SECONDS = 15 * 60;

const ISSUER = "uniarchive";
const AUDIENCE = "uniarchive-web";

export interface SessionClaims {
  sub: string; // user id
  role: UserRole;
  upid: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionJwt(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, upid: claims.upid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_JWT_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the claims, or null if the token is missing, expired or invalid. */
export async function verifySessionJwt(
  token: string | undefined,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.upid !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      upid: payload.upid,
    };
  } catch {
    return null;
  }
}

export function sessionJwtCookieOptions(maxAgeSeconds = SESSION_JWT_TTL_SECONDS) {
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
