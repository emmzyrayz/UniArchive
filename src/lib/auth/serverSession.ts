// src/lib/auth/serverSession.ts
// Session lookup for server components, which have the cookie store rather
// than a NextRequest. Same rules as lib/auth/session.ts.
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  getSessionUserByToken,
  type SessionUser,
} from "@/lib/auth/session";

export async function getServerSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUserByToken(token);
}
