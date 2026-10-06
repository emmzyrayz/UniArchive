// src/lib/auth/serverSession.ts
// Session lookup for server components, which have the cookie store rather
// than a NextRequest. Same rules as lib/auth/session.ts.
import { cookies, headers } from "next/headers";
import { devAuthActive, getDevSessionUser } from "@/lib/auth/devAuth";
import {
  SESSION_COOKIE,
  getSessionUserByToken,
  type SessionUser,
} from "@/lib/auth/session";

export async function getServerSessionUser(): Promise<SessionUser | null> {
  // Dev mode: the DEV_USER_UPID account (lib/auth/devAuth.ts)
  if (devAuthActive((await headers()).get("host"))) return getDevSessionUser();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUserByToken(token);
}
