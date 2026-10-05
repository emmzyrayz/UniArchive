// POST /api/admin/broadcasts/audience  { audience, kind }
// How many people a broadcast would reach and the first 10 of them (masked
// emails), from the same resolver the send uses. Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { cleanAudience } from "@/lib/broadcast/audience";
import { resolveRecipients, toRecipientPreview } from "@/lib/broadcast/recipients";
import type { AdminAudiencePreview } from "@/types/admin";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `broadcast-audience:${session.userId}`);
    const input = await readJson<{ audience: unknown; kind: unknown }>(request);
    if (input?.kind !== "announcements" && input?.kind !== "newsletter") {
      return fail(400, 'kind must be "announcements" or "newsletter".');
    }
    const { audience, problems } = cleanAudience(input.audience);
    if (problems.length) return fail(400, problems.join(" "));
    const recipients = await resolveRecipients(audience, input.kind);
    const body: AdminAudiencePreview = {
      total: recipients.length,
      sample: recipients.slice(0, 10).map(toRecipientPreview),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/broadcasts/audience");
  }
}
