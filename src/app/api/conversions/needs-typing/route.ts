// GET /api/conversions/needs-typing?limit=6
// Materials with no typed content that the signed-in user could type out,
// nearest to them first (lib/needsTyping.ts). limit: 1-24, default 6.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { NEEDS_TYPING_MAX, materialsNeedingTyping } from "@/lib/needsTyping";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `needs-typing:${session.userId}`);
    const asked = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "", 10);
    const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, NEEDS_TYPING_MAX) : 6;
    return NextResponse.json(await materialsNeedingTyping(session, limit), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/conversions/needs-typing");
  }
}
