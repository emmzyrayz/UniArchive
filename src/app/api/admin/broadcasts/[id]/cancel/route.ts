// POST /api/admin/broadcasts/[id]/cancel
// Stops a scheduled broadcast in Brevo before its send time.
// Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { SendError, cancelBroadcast } from "@/lib/broadcast/send";
import { toBroadcastDto } from "@/lib/broadcast/drafts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "mail.broadcast");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    const broadcast = await cancelBroadcast(id);
    return NextResponse.json({ broadcast: toBroadcastDto(broadcast) });
  } catch (error) {
    if (error instanceof SendError) return fail(error.status, error.message);
    return handleRouteError(error, "POST /api/admin/broadcasts/[id]/cancel");
  }
}
