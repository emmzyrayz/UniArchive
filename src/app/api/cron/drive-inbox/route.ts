// GET /api/cron/drive-inbox
// Daily (vercel.json "crons"): imports new PDFs shared with UniArchive's
// Gmail into the staff queue (lib/drive/inbox.ts), for up to 4 minutes; the
// rest waits for the next run or "Check now". Bearer CRON_SECRET; does
// nothing until the inbox is connected.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { cronDenied } from "@/lib/cronAuth";
import { runInboxCheck } from "@/lib/drive/inbox";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const denied = cronDenied(request);
    if (denied) return denied;
    const result = await runInboxCheck(240_000);
    if (result.status !== "done") return NextResponse.json({ ok: true, skipped: result.status });
    const failed = !!result.summary.error;
    return NextResponse.json({ ok: !failed, ...result.summary }, { status: failed ? 500 : 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/drive-inbox");
  }
}
