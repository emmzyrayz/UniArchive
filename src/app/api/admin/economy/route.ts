// GET /api/admin/economy
// Every economy module with its earn sources and products (defaults,
// overrides, what's in effect), the system account totals and recent
// staff adjustments. Permission: economy.manage.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { economyRouteError } from "@/lib/economy/http";
import { economyOverview } from "@/lib/economy/admin";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "economy.manage");
    return NextResponse.json(await economyOverview(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return economyRouteError(error, "GET /api/admin/economy");
  }
}
