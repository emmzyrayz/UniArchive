// POST /api/materials/[id]/view
// Counts a view of a UniLibrary material. No sign-in needed. Each IP counts
// at most once per material per hour; repeats still get 200 so the client
// never has to care. Uses the in-memory limiter, so on serverless the
// "once per hour" is per instance.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit, rateLimit } from "@/lib/rateLimit";

type Context = { params: Promise<{ id: string }> };

const VIEW_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest, context: Context) {
  try {
    // Caps how many different materials one IP can hit per minute
    enforceRateLimit(request, "material-view", 60);

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Material not found." }, { status: 404 });
    }

    const { allowed } = rateLimit(
      `material-view:${id}:${getClientIp(request)}`,
      1,
      VIEW_WINDOW_MS,
    );
    if (!allowed) return NextResponse.json({ success: true, counted: false });

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
