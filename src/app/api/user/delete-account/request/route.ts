// POST /api/user/delete-account/request
// Emails the signed-in user a code to confirm deleting their account
// (lib/account/deletion.ts). Staff accounts are refused. Rate limited like
// other emailed codes.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { DeletionError, requestDeletionCode } from "@/lib/account/deletion";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "authEmail", `delete-account:${session.userId}`);
    const sentTo = await requestDeletionCode(session.userId);
    return NextResponse.json({ ok: true, sentTo });
  } catch (error) {
    if (error instanceof DeletionError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "POST /api/user/delete-account/request");
  }
}
