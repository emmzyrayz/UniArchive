// DELETE /api/auth/sessions/:id
// Signs out one of the signed-in user's sessions (id = SessionCache.uuid).
// That device's API calls fail at once; its short-lived page JWT runs out
// within 15 minutes and can't be refreshed.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { hashForSearch } from "@/lib/encryption";
import {
  SESSION_COOKIE,
  readSessionToken,
  requireAuth,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_JWT_COOKIE, sessionJwtCookieOptions } from "@/lib/auth/jwt";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "auth", `sessions-revoke:${session.userId}`);
    const { id } = await context.params;
    if (!UUID.test(id)) {
      return NextResponse.json({ message: "Session not found." }, { status: 404 });
    }

    const SessionCache = await getSessionCacheModel();
    // Scoped to the caller, so nobody can sign out someone else's session
    const revoked = await SessionCache.findOneAndUpdate(
      { uuid: id, userId: session.userId, isSignedIn: true },
      { isActive: false, isSignedIn: false, updatedAt: new Date() },
      { projection: { sessionTokenHash: 1 } },
    ).lean();
    if (!revoked) {
      return NextResponse.json({ message: "Session not found." }, { status: 404 });
    }

    const current = revoked.sessionTokenHash === hashForSearch(readSessionToken(request) ?? "");
    const response = NextResponse.json({ success: true, current });
    if (current) {
      response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
      response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
    }
    return response;
  } catch (error) {
    return handleRouteError(error, "session-revoke");
  }
}
