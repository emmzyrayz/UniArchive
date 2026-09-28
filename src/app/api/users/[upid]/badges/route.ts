// GET /api/users/[upid]/badges - a user's badges, public. Unknown and
// suspended accounts are a plain 404, like their profile.
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { findPublicUser } from "@/lib/publicProfile";
import { listBadges } from "@/lib/badges";

type Context = { params: Promise<{ upid: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `public-profile:${getClientIp(request)}`);
    const user = await findPublicUser((await context.params).upid);
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    const badges = await listBadges(user._id);
    return NextResponse.json({ badges, total: badges.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/users/[upid]/badges");
  }
}
