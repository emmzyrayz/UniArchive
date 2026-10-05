// GET /api/user/data-export
// "Download my data": the signed-in user's data as a JSON file
// (lib/account/dataExport.ts). 5 an hour.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { buildDataExport } from "@/lib/account/dataExport";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "dataExport", `data-export:${session.userId}`);
    const data = await buildDataExport(session.userId);
    if (!data) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="uniarchive-data-${session.upid}-${date}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/data-export");
  }
}
