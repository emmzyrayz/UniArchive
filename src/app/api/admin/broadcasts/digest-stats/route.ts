// GET /api/admin/broadcasts/digest-stats?month=YYYY-MM
// The numbers and standout materials for a "Monthly digest" broadcast
// (lib/broadcast/digestStats.ts). Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { digestStats } from "@/lib/broadcast/digestStats";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `digest-stats:${session.userId}`);
    const stats = await digestStats(request.nextUrl.searchParams.get("month") ?? "");
    if (!stats) return fail(400, 'month must look like "2026-10".');
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/broadcasts/digest-stats");
  }
}
