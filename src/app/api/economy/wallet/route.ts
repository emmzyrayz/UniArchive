// GET /api/economy/wallet
// The signed-in person's credits: AC and XP balances, level, and today's
// earnings against the daily cap.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { economyRouteError } from "@/lib/economy/http";
import { walletSummary } from "@/lib/economy/wallet";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    return NextResponse.json(await walletSummary(session.userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/economy/wallet");
  }
}
