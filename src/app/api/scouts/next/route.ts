// GET /api/scouts/next?task=identify|readable|check_typed&skip=<id>,<id>
// The next task of that type for the signed-in person, nearest to them
// first, or { card: null } when there's nothing left. Voted tasks come with
// a signed token the answer must carry. `skip` lists subjects they passed on
// this session (up to 50).
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { economyRouteError } from "@/lib/economy/http";
import { nextTask } from "@/lib/scouts/engine";
import { SCOUT_TASK_IDS, type ScoutTask } from "@/lib/scouts/taskTypes";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "scoutNext", `scout-next:${session.userId}`);
    const params = request.nextUrl.searchParams;
    const task = params.get("task") as ScoutTask;
    if (!SCOUT_TASK_IDS.includes(task)) {
      return NextResponse.json({ message: `task must be one of ${SCOUT_TASK_IDS.join(", ")}.` }, { status: 400 });
    }
    const skip = (params.get("skip") ?? "").split(",").filter(Boolean).slice(0, 50);
    const card = await nextTask(session.userId, task, skip);
    return NextResponse.json({ card }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/scouts/next");
  }
}
