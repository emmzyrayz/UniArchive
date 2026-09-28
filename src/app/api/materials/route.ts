// GET /api/materials
// The public UniLibrary feed: verified, active materials. No sign-in needed
// to browse; reading still goes through /read/[bookId], which requires one.
//
// Filters: category, universityId, departmentId, courseCode, level, semester,
// search (full-text on title/description/tags/courseCode, 2+ chars), tier
// ("1" = verified only, "2" = endorsed). sort: "recent" (default) or
// "popular" (by views). page, limit (default 20, max 50). Every response
// carries per-category counts (all other filters applied) for the tabs.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import {
  PUBLIC_MATERIAL_FIELDS,
  toMaterialSummary,
  type PublicMaterialDoc,
} from "@/lib/publicMaterials";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { escapeRegex } from "@/lib/escapeRegex";
import {
  isMaterialCategory,
  type MaterialCategory,
} from "@/lib/constants/materialCategories";
import type { MaterialsResponse } from "@/types/unilibrary";

const MAX_LIMIT = 50;
const MIN_SEARCH = 2;

const badRequest = (message: string) => NextResponse.json({ message }, { status: 400 });

function positiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "public", `materials:${getClientIp(request)}`);
    const params = request.nextUrl.searchParams;

    const category = params.get("category");
    if (category && !isMaterialCategory(category)) return badRequest("Unknown category.");
    const universityId = params.get("universityId");
    if (universityId && !isValidObjectId(universityId)) {
      return badRequest("universityId is not a valid id.");
    }
    const departmentId = params.get("departmentId");
    if (departmentId && !isValidObjectId(departmentId)) {
      return badRequest("departmentId is not a valid id.");
    }
    const tier = params.get("tier");
    if (tier && tier !== "1" && tier !== "2") return badRequest('tier must be "1" or "2".');
    const sort = params.get("sort") ?? "recent";
    if (sort !== "recent" && sort !== "popular") {
      return badRequest('sort must be "recent" or "popular".');
    }
    const courseCode = params.get("courseCode")?.trim().slice(0, 20);
    const level = params.get("level")?.trim().slice(0, 10);
    const semester = params.get("semester")?.trim().slice(0, 20);
    const search = params.get("search")?.trim().slice(0, 200);
    const page = positiveInt(params.get("page"), 1);
    const limit = Math.min(positiveInt(params.get("limit"), 20), MAX_LIMIT);

    // Everything except category, so the tab counts reflect the other filters
    const base: Record<string, unknown> = { isActive: true };
    if (universityId) base.universityId = new Types.ObjectId(universityId);
    if (departmentId) base.departmentId = new Types.ObjectId(departmentId);
    if (courseCode) {
      base.courseCode = { $regex: escapeRegex(courseCode), $options: "i" };
    }
    if (level) base.level = level;
    if (semester) base.semester = semester;
    if (tier) base.verificationTier = tier === "2" ? "tier2" : "tier1";
    if (search && search.length >= MIN_SEARCH) base.$text = { $search: search };

    const listFilter = category ? { ...base, category } : base;
    const sortBy: Record<string, 1 | -1> =
      sort === "popular"
        ? { viewCount: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };
    const skip = (page - 1) * limit;

    const Material = await getMaterialModel();
    const [docs, total, grouped] = await Promise.all([
      Material.find(listFilter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .select(PUBLIC_MATERIAL_FIELDS)
        .lean<PublicMaterialDoc[]>(),
      Material.countDocuments(listFilter),
      Material.aggregate<{ _id: MaterialCategory; count: number }>([
        { $match: base },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const categoryCounts: MaterialsResponse["categoryCounts"] = {};
    for (const g of grouped) categoryCounts[g._id] = g.count;

    const body: MaterialsResponse = {
      materials: docs.map(toMaterialSummary),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + docs.length < total,
      categoryCounts,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials");
  }
}
