// POST /api/admin/broadcasts/[id]/send  { confirmCount, scheduledAt? }
// Sends a complete draft through Brevo now, or schedules it (ISO time,
// 10 minutes to 90 days ahead). confirmCount is the recipient count the
// admin saw; if the audience has changed since, 409 with the new `total`.
// See lib/broadcast/send.ts. Permission: "mail.broadcast"; 10 a day each.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { brevoConfigured } from "@/lib/brevo";
import { SendError, parseSchedule, sendBroadcast } from "@/lib/broadcast/send";
import { toBroadcastDto } from "@/lib/broadcast/drafts";

// Importing contacts into Brevo and waiting for it takes a while
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    if (!brevoConfigured()) return fail(503, "Brevo isn't set up on this server (BREVO_API_KEY).");

    const input = await readJson<{ confirmCount: unknown; scheduledAt: unknown }>(request);
    const confirmCount = Number(input?.confirmCount);
    if (!Number.isInteger(confirmCount) || confirmCount < 1) return fail(400, "Confirm the number of recipients.");

    const scheduledAt = parseSchedule(input?.scheduledAt);
    await enforceRateLimit(request, "broadcastSend", `broadcast-send:${session.userId}`);
    const broadcast = await sendBroadcast(id, {
      confirmCount,
      scheduledAt,
      by: { userId: session.userId, upid: session.upid, name: session.fullName },
    });
    return NextResponse.json({ broadcast: toBroadcastDto(broadcast) });
  } catch (error) {
    if (error instanceof SendError) {
      return NextResponse.json({ message: error.message, ...error.extra }, { status: error.status });
    }
    return handleRouteError(error, "POST /api/admin/broadcasts/[id]/send");
  }
}
