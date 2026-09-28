// GET  /api/admin/institutions - universities with their faculty/department
//                                counts, inactive ones included
//   Filters: search (name or abbreviation), ownership, type,
//   status ("all" default, "active", "inactive"). page, limit (max 50).
// POST /api/admin/institutions - add a university
//   Body: { name, abbreviation, state, ownership, type?, city?, website? }
//
// Permission: "manage_institution" (ed_admin, com_admin, webmaster, dev).
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { escapeRegex } from "@/lib/escapeRegex";
import { fail, isDuplicateKey, optionalString, pagination, totalPages } from "@/lib/adminApi";
import {
  getUniversityModel,
  type IUniversity,
  type UniversityOwnership,
  type UniversityType,
} from "@/lib/models/university/universityModel";
import {
  checkNewUniversity,
  createUniversity,
  isOwnership,
  isUniversityType,
  normaliseAbbr,
  toAdminUniversityDto,
} from "@/lib/institutionAdmin";
import type { AdminUniversitiesResponse } from "@/types/admin";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "manage_institution");
    const params = request.nextUrl.searchParams;

    const ownership = params.get("ownership");
    if (ownership && !isOwnership(ownership)) return fail(400, "Unknown ownership.");
    const type = params.get("type");
    if (type && !isUniversityType(type)) return fail(400, "Unknown institution type.");
    const status = params.get("status") ?? "all";
    if (!["active", "inactive", "all"].includes(status)) {
      return fail(400, 'status must be "active", "inactive" or "all".');
    }
    const search = params.get("search")?.trim().slice(0, 100);
    const { page, limit, skip } = pagination(params);

    const filter: Record<string, unknown> = {};
    if (ownership) filter.ownership = ownership as UniversityOwnership;
    if (type) filter.type = type as UniversityType;
    if (status !== "all") filter.isActive = status === "active";
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: pattern }, { abbreviation: pattern }];
    }

    const University = await getUniversityModel();
    const [docs, total] = await Promise.all([
      University.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean<IUniversity[]>(),
      University.countDocuments(filter),
    ]);

    const body: AdminUniversitiesResponse = {
      universities: docs.map(toAdminUniversityDto),
      total,
      page,
      totalPages: totalPages(total, limit),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/institutions");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "manage_institution");
    await enforceRateLimit(request, "admin", `admin-institutions:${session.userId}`);

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");
    const input = {
      name: optionalString(body.name, 200) ?? "",
      abbreviation: normaliseAbbr(optionalString(body.abbreviation, 30) ?? ""),
      state: body.state as string,
      ownership: body.ownership as UniversityOwnership,
      type: (body.type || undefined) as UniversityType | undefined,
      city: optionalString(body.city, 100) || undefined,
      website: optionalString(body.website, 300) || undefined,
    };
    const invalid = checkNewUniversity(input);
    if (invalid) return fail(400, invalid);

    try {
      const university = await createUniversity(input, session.userId, "admin");
      console.info(`admin: @${session.upid} added university ${university.abbreviation}`);
      return NextResponse.json({ university: toAdminUniversityDto(university) }, { status: 201 });
    } catch (error) {
      if (isDuplicateKey(error)) {
        return fail(409, "A university with that abbreviation or name already exists.");
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/institutions");
  }
}
