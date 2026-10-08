// GET /api/cron/scouts
// Daily at 17:00 UTC (18:00 in Lagos; vercel.json "crons"): reminds Scouts
// whose streak ends at midnight (lib/scouts/daily.ts). Bearer CRON_SECRET.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { cronDenied } from "@/lib/cronAuth";
import { runScoutsDaily } from "@/lib/scouts/daily";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const denied = cronDenied(request);
    if (denied) return denied;
    return NextResponse.json({ ok: true, ...(await runScoutsDaily()) });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/scouts");
  }
}
