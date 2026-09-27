// GET /api/admin/materials
// Every UniLibrary material, including deactivated ones.
// Permission: "admin.view_submissions".
//
// Filters: status ("active" default, "inactive", "all"), category,
// universityId, search (full-text, 2+ chars), tier ("1" | "2"). sort:
// "recent" (default), "popular" (views) or "reported". page, limit (max 50).
// Every response carries active/inactive counts with the other filters
// applied, for the tabs.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { isMaterialCategory } from "@/lib/constants/materialCategories";
import {
  ADMIN_MATERIAL_FIELDS,
  toAdminMaterialDto,
  type AdminMaterialDoc,
} from "@/lib/adminMaterials";
import type { AdminMaterialsResponse } from "@/types/admin";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent: { createdAt: -1, _id: -1 },
  popular: { viewCount: -1, createdAt: -1, _id: -1 },
  reported: { reportCount: -1, createdAt: -1, _id: -1 },
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "admin.view_submissions");
    const params = request.nextUrl.searchParams;

    const status = params.get("status") ?? "active";
    if (!["active", "inactive", "all"].includes(status)) {
      return fail(400, 'status must be "active", "inactive" or "all".');
    }
    const category = params.get("category");
    if (category && !isMaterialCategory(category)) return fail(400, "Unknown category.");
    const universityId = params.get("universityId");
    if (universityId && !isValidObjectId(universityId)) {
      return fail(400, "universityId is not a valid id.");
    }
    const tier = params.get("tier");
    if (tier && tier !== "1" && tier !== "2") return fail(400, 'tier must be "1" or "2".');
    const sort = params.get("sort") ?? "recent";
    if (!SORTS[sort]) return fail(400, 'sort must be "recent", "popular" or "reported".');
    const search = params.get("search")?.trim().slice(0, 200);
    const { page, limit, skip } = pagination(params);

    const base: Record<string, unknown> = {};
    if (category) base.category = category;
    if (universityId) base.universityId = new Types.ObjectId(universityId);
    if (tier) base.verificationTier = tier === "2" ? "tier2" : "tier1";
    if (search && search.length >= 2) base.$text = { $search: search };

    const filter = status === "all" ? base : { ...base, isActive: status === "active" };

    const Material = await getMaterialModel();
    const [docs, total, active, inactive] = await Promise.all([
      Material.find(filter)
        .sort(SORTS[sort])
        .skip(skip)
        .limit(limit)
        .select(ADMIN_MATERIAL_FIELDS)
        .lean<AdminMaterialDoc[]>(),
      Material.countDocuments(filter),
      Material.countDocuments({ ...base, isActive: true }),
      Material.countDocuments({ ...base, isActive: false }),
    ]);

    const body: AdminMaterialsResponse = {
      materials: docs.map(toAdminMaterialDto),
      total,
      page,
      totalPages: totalPages(total, limit),
      counts: { active, inactive },
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/materials");
  }
}
