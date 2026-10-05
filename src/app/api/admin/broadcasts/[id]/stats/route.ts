// POST /api/admin/broadcasts/[id]/stats  { force? }
// Pulls Brevo's numbers for a sent or scheduled broadcast (at most every 5
// minutes unless force), and notices when a scheduled one has gone out.
// Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { BrevoError } from "@/lib/brevo";
import { SendError, refreshBroadcastStats } from "@/lib/broadcast/send";
import { toBroadcastDto } from "@/lib/broadcast/drafts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `broadcast-stats:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    const input = await readJson<{ force: unknown }>(request);
    const broadcast = await refreshBroadcastStats(id, input?.force === true);
    return NextResponse.json({ broadcast: toBroadcastDto(broadcast) });
  } catch (error) {
    if (error instanceof SendError) return fail(error.status, error.message);
    if (error instanceof BrevoError) return fail(502, `Couldn't reach Brevo: ${error.message}`);
    return handleRouteError(error, "POST /api/admin/broadcasts/[id]/stats");
  }
}
