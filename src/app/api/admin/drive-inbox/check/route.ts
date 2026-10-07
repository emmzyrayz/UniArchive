// POST /api/admin/drive-inbox/check — "Check now": imports new PDFs shared
// with the inbox account into the staff queue (lib/drive/inbox.ts), for up
// to 4 minutes; the rest waits for the next check.
// Permission: "material.drive_inbox".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { runInboxCheck } from "@/lib/drive/inbox";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "material.drive_inbox");
    await enforceRateLimit(request, "admin", `drive-inbox-check:${session.userId}`);
    const result = await runInboxCheck(240_000);
    if (result.status === "not_connected") {
      return NextResponse.json({ message: "Connect the inbox account first." }, { status: 409 });
    }
    if (result.status === "busy") {
      return NextResponse.json({ message: "A check is already running. Try again in a few minutes." }, { status: 409 });
    }
    return NextResponse.json(result.summary);
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/drive-inbox/check");
  }
}
