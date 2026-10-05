// POST /api/user/delete-account/confirm  { code }
// Confirms deletion with the emailed code: the account is erased after 7
// days unless the user signs in before then, and every session (this one
// too) is signed out now. See lib/account/deletion.ts.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { SESSION_JWT_COOKIE, sessionJwtCookieOptions } from "@/lib/auth/jwt";
import { clearDeviceCookie } from "@/lib/auth/deviceRecognition";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { DeletionError, confirmDeletion } from "@/lib/account/deletion";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "auth", `delete-account-confirm:${session.userId}`);
    const body = await readJson<{ code: string }>(request);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const purgeAfter = await confirmDeletion(session.userId, code);

    const response = NextResponse.json({ ok: true, purgeAfter: purgeAfter.toISOString() });
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
    clearDeviceCookie(response);
    return response;
  } catch (error) {
    if (error instanceof DeletionError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "POST /api/user/delete-account/confirm");
  }
}
