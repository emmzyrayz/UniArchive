// GET /api/users/[upid]/materials
// A user's verified, active UniLibrary materials, newest first. No sign-in
// needed. Same item shape as GET /api/materials.
// Query: category, page, limit (default 12, max 50).
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { isMaterialCategory } from "@/lib/constants/materialCategories";
import {
  PUBLIC_MATERIAL_FIELDS,
  toMaterialSummaries,
  type PublicMaterialDoc,
} from "@/lib/publicMaterials";
import { findPublicUser } from "@/lib/publicProfile";
import type { PublicMaterialsResponse } from "@/types/publicProfile";

type Context = { params: Promise<{ upid: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `public-profile:${getClientIp(request)}`);
    const params = request.nextUrl.searchParams;
    const rawCategory = params.get("category");
    if (rawCategory && !isMaterialCategory(rawCategory)) return fail(400, "Unknown category.");
    const category = rawCategory && isMaterialCategory(rawCategory) ? rawCategory : undefined;
    const { page, limit, skip } = pagination(params, 12);

    // Resolving the user first hides a suspended account's materials too,
    // and lets the query use the { submittedBy, createdAt } index
    const user = await findPublicUser((await context.params).upid);
    if (!user) return fail(404, "User not found.");

    const filter = {
      submittedBy: user._id,
      isActive: true,
      ...(category ? { category } : {}),
    };
    const Material = await getMaterialModel();
    const [docs, total] = await Promise.all([
      Material.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .select(PUBLIC_MATERIAL_FIELDS)
        .lean<PublicMaterialDoc[]>(),
      Material.countDocuments(filter),
    ]);

    const body: PublicMaterialsResponse = {
      materials: await toMaterialSummaries(docs),
      total,
      page,
      totalPages: totalPages(total, limit),
      hasMore: skip + docs.length < total,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/users/[upid]/materials");
  }
}
