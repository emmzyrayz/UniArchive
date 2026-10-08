// GET /api/scouts/summary
// The /scouts hub: the person's wallet and, per task type, how many tasks
// are waiting for them, how many they've answered (and are still waiting
// on), and their accuracy.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { economyRouteError } from "@/lib/economy/http";
import { walletSummary } from "@/lib/economy/wallet";
import { scoutSummary, WAITING_CAP } from "@/lib/scouts/engine";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const [wallet, tasks] = await Promise.all([walletSummary(session.userId), scoutSummary(session.userId)]);
    return NextResponse.json({ wallet, tasks, waitingCap: WAITING_CAP }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/scouts/summary");
  }
}
