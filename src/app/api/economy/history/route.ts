// GET /api/economy/history?before=<id>
// The signed-in person's credit history, newest first, 30 a page.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { economyRouteError } from "@/lib/economy/http";
import { walletHistory } from "@/lib/economy/wallet";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const page = await walletHistory(session.userId, request.nextUrl.searchParams.get("before") ?? undefined);
    return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/economy/history");
  }
}
