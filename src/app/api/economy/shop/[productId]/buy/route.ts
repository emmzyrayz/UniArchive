// POST /api/economy/shop/[productId]/buy
// Buys one item with credits. Header Idempotency-Key (8-64 letters, digits,
// - or _): a retry with the same key returns the first purchase. The body
// carries the item's own choices (e.g. which frame), checked by its module.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { economyRouteError } from "@/lib/economy/http";
import { buy } from "@/lib/economy/shop";

type Context = { params: Promise<{ productId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "economyBuy", `economy-buy:${session.userId}`);
    const { productId } = await context.params;
    const body = (await readJson<Record<string, unknown>>(request)) ?? {};
    const result = await buy(session.userId, productId, body, request.headers.get("idempotency-key") ?? "");
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return economyRouteError(error, "POST /api/economy/shop/[productId]/buy");
  }
}
