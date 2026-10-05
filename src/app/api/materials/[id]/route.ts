// GET /api/materials/[id]
// One UniLibrary material for its detail page (/materials/[id]): the same
// public fields as the feed, plus how much typed content it has and its
// outline (table of contents / course outline). No sign-in
// needed. The PDF itself is opened through /read/[bookId], which checks
// access and signs the file URL; this route never hands out file URLs.
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getMaterialDetail } from "@/lib/materialDetail";
import type { MaterialDetail } from "@/types/layer2";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `material:${getClientIp(request)}`);
    // Same loader as the server-rendered page (lib/materialDetail.ts)
    const detail = await getMaterialDetail((await context.params).id);
    if (!detail) return fail(404, "Material not found.");
    const body: MaterialDetail & { updatedAt: string } = detail;
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]");
  }
}
