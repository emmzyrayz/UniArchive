// GET /api/cron/tidy-brevo-lists
// Weekly (vercel.json "crons"): deletes old per-broadcast contact lists
// from Brevo (lib/broadcast/tidyLists.ts). Bearer CRON_SECRET, like every
// cron route; does nothing without BREVO_API_KEY.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { cronDenied } from "@/lib/cronAuth";
import { brevoConfigured } from "@/lib/brevo";
import { tidyBroadcastLists } from "@/lib/broadcast/tidyLists";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const denied = cronDenied(request);
    if (denied) return denied;
    if (!brevoConfigured()) return NextResponse.json({ ok: true, skipped: "BREVO_API_KEY is not set." });
    const result = await tidyBroadcastLists({ apply: true, limit: 50 });
    return NextResponse.json({ ok: result.failed.length === 0, ...result }, { status: result.failed.length ? 500 : 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/tidy-brevo-lists");
  }
}
