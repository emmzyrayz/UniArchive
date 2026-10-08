// GET /api/economy/shop
// Everything on sale from every economy module, with the price after admin
// overrides and, per item, why this person can't buy it yet.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { economyRouteError } from "@/lib/economy/http";
import { listShop } from "@/lib/economy/shop";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    return NextResponse.json({ items: await listShop(session.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/economy/shop");
  }
}
