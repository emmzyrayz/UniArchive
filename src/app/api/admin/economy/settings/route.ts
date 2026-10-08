// PUT /api/admin/economy/settings
// Saves an override: { id, enabled?, price?, rewards?: {AC?, XP?}, dailyCap? }
// (null on a field restores the default) or { id, reset: true }.
// id "core" holds the overall daily AC cap. Permission: economy.manage.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { economyRouteError } from "@/lib/economy/http";
import { saveEconomySetting } from "@/lib/economy/admin";

export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission(request, "economy.manage");
    await enforceRateLimit(request, "economyAdmin", `economy-admin:${session.userId}`);
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return NextResponse.json({ message: "Send the setting as JSON." }, { status: 400 });
    const setting = await saveEconomySetting(body, { userId: session.userId, upid: session.upid });
    return NextResponse.json({ setting });
  } catch (error) {
    return economyRouteError(error, "PUT /api/admin/economy/settings");
  }
}
