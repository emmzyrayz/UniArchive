// POST /api/materials/[id]/view
// Counts a view of a UniLibrary material. No sign-in needed. Each IP counts
// at most once per material per hour (tracked in Redis, so it holds across
// server instances); repeats still get 200 so the client never has to care.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit, enforceRateLimit } from "@/lib/rateLimitRedis";
import { awardBadgesAfter } from "@/lib/badges";

type Context = { params: Promise<{ id: string }> };

const POPULAR_VIEWS = 100;

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
    const updated = await Material.findOneAndUpdate(
      { _id: id, isActive: true },
      { $inc: { viewCount: 1 } },
      { returnDocument: "after", timestamps: false },
    )
      .select("viewCount submittedBy")
      .lean();
    if (!updated) {
      return NextResponse.json({ message: "Material not found." }, { status: 404 });
    }
    // popular_material is at 100 views; check each 10th view from there
    if (updated.viewCount >= POPULAR_VIEWS && updated.viewCount % 10 === 0) {
      awardBadgesAfter(updated.submittedBy, "view_milestone");
    }
    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/view");
  }
}
