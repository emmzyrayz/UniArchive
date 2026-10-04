// POST /api/webhooks/brevo?token=<BREVO_WEBHOOK_SECRET>
// Brevo calls this when someone unsubscribes from a broadcast or marks one
// as spam. Brevo then blocks the address for every campaign, so both kinds
// of bulk email are turned off here too (the user can turn them back on in
// Settings or from the link, which lifts the block). Other events are
// acknowledged and ignored. Always 200 for a valid call, so Brevo doesn't
// retry events we chose to ignore.
//
// Set the URL in Brevo: Campaigns > Settings > Webhooks (marketing), events
// "Unsubscribed" and "Marked as spam". The secret can also be sent as
// "Authorization: Bearer <secret>".
import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { normaliseEmail } from "@/lib/auth/tokens";

// Brevo's names differ between marketing and transactional webhooks
const OPT_OUT_EVENTS = new Set(["unsubscribe", "unsubscribed", "spam"]);

function authorised(request: NextRequest): boolean {
  const secret = process.env.BREVO_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const given = request.nextUrl.searchParams.get("token") ?? bearer ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

interface BrevoEvent {
  event?: string;
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BREVO_WEBHOOK_SECRET?.trim()) {
      return NextResponse.json({ message: "Webhook not configured." }, { status: 503 });
    }
    if (!authorised(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const payload = (await request.json().catch(() => null)) as BrevoEvent | BrevoEvent[] | null;
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ message: "Expected a JSON event." }, { status: 400 });
    }
    const events = (Array.isArray(payload) ? payload : [payload]).slice(0, 500);

    const User = await getUserModel();
    let updated = 0;
    for (const e of events) {
      const event = typeof e?.event === "string" ? e.event.toLowerCase() : "";
      if (!OPT_OUT_EVENTS.has(event) || typeof e.email !== "string" || !e.email.includes("@")) continue;
      const result = await User.updateOne(
        { emailHash: hashForSearch(normaliseEmail(e.email)) },
        {
          $set: {
            "emailPrefs.announcements": false,
            "emailPrefs.newsletter": false,
            "emailPrefs.brevoBlocked": true,
            "emailPrefs.source": "brevo",
            "emailPrefs.updatedAt": new Date(),
          },
        },
      );
      updated += result.modifiedCount;
    }
    if (updated) console.info(`[brevo-webhook] opted out ${updated} user(s)`);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return handleRouteError(error, "POST /api/webhooks/brevo");
  }
}
