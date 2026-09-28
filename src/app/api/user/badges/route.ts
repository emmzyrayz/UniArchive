// GET /api/user/badges - every badge the signed-in user has earned, newest
// first. Also schedules a throttled catch-up check (lib/badges.ts).
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { catchUpBadgesAfter, listBadges } from "@/lib/badges";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    catchUpBadgesAfter(session.userId);
    const badges = await listBadges(session.userId);
    return NextResponse.json(
      { badges, total: badges.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/user/badges");
  }
}
