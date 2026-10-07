// GET /api/cron/purge-accounts
// Daily (vercel.json "crons"): erases accounts whose 7-day deletion grace
// period has ended (lib/account/deletion.ts). Vercel Cron sends
// "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET set this
// answers 503 and does nothing.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { cronDenied } from "@/lib/cronAuth";
import { purgeDueAccounts } from "@/lib/account/deletion";

// Each account touches storage, Cloudinary and Brevo; 10 a run fits in 60s
// (the rest are picked up the next day)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const denied = cronDenied(request);
    if (denied) return denied;
    const result = await purgeDueAccounts(10);
    return NextResponse.json({ ok: result.failed.length === 0, ...result }, { status: result.failed.length ? 500 : 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/purge-accounts");
  }
}
