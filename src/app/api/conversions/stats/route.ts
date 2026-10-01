// GET /api/conversions/stats
// The signed-in user's conversion stats (dashboard Conversions tab), from
// what they've published. Cached for five minutes; see lib/conversionStats.ts.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getConversionStats } from "@/lib/conversionStats";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `conv-stats:${session.userId}`);
    const { stats, cached } = await getConversionStats(session.userId);
    return NextResponse.json({ stats, cached }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/conversions/stats");
  }
}
