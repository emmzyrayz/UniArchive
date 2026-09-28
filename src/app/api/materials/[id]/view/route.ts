// POST /api/materials/[id]/view
// Counts a view of a UniLibrary material. No sign-in needed. Each IP counts
// at most once per material per hour (tracked in Redis, so it holds across
// server instances); repeats still get 200 so the client never has to care.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit, enforceRateLimit } from "@/lib/rateLimitRedis";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    // Caps how many different materials one IP can hit per minute
    await enforceRateLimit(request, "public", `material-view:${getClientIp(request)}`);

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Material not found." }, { status: 404 });
    }

    const { success: firstViewThisHour } = await checkRateLimit(
      request,
      "viewOnce",
      `${id}:${getClientIp(request)}`,
    );
    if (!firstViewThisHour) return NextResponse.json({ success: true, counted: false });

    const Material = await getMaterialModel();
    const updated = await Material.updateOne(
      { _id: id, isActive: true },
      { $inc: { viewCount: 1 } },
      { timestamps: false },
    );
    if (updated.matchedCount === 0) {
      return NextResponse.json({ message: "Material not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/view");
  }
}
