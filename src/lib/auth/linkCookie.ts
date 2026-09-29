// src/lib/auth/linkCookie.ts
// The httpOnly `ua_link` cookie holding the raw token of a pending Google
// link (see models/pendingLinkModel.ts). Kept separate from googleAccount.ts
// so the link-account page can read it without pulling in the email code.
import { PENDING_LINK_TTL_SECONDS } from "@/lib/models/pendingLinkModel";

export const LINK_COOKIE = "ua_link";

export function linkCookieOptions(maxAge = PENDING_LINK_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function readLinkToken(value: string | undefined): string | null {
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
