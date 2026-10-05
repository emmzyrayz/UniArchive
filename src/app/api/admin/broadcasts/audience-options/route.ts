// GET /api/admin/broadcasts/audience-options
// Schools, departments, levels and roles that users actually have, with
// counts, for the audience picker. Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { audienceOptions } from "@/lib/broadcast/recipients";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "mail.broadcast");
    return NextResponse.json(await audienceOptions(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/broadcasts/audience-options");
  }
}
