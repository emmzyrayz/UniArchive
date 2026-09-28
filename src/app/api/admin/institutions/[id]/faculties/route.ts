// GET  /api/admin/institutions/[id]/faculties - all faculties of a
//                                               university, removed ones too
// POST /api/admin/institutions/[id]/faculties - add one
//   Body: { name, abbreviation? }. A removed faculty with the same name is
//   restored instead of duplicated.
// Permission: "manage_institution".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { escapeRegex } from "@/lib/escapeRegex";
import { fail, isDuplicateKey, optionalString } from "@/lib/adminApi";
import { getFacultyModel, type IFaculty } from "@/lib/models/university/facultyModel";
import {
  checkName,
  checkUnitAbbr,
  loadUniversity,
  refreshInstitutionCounts,
  toAdminFacultyDto,
} from "@/lib/institutionAdmin";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "manage_institution");
    const university = await loadUniversity((await context.params).id);
    if (!university) return fail(404, "University not found.");

    const Faculty = await getFacultyModel();
    const faculties = await Faculty.find({ universityId: university._id })
      .sort({ isActive: -1, name: 1 })
      .lean<IFaculty[]>();
    return NextResponse.json(
      { faculties: faculties.map(toAdminFacultyDto) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/institutions/[id]/faculties");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    await enforceRateLimit(request, "admin", `admin-institutions:${session.userId}`);
    const university = await loadUniversity((await context.params).id);
    if (!university) return fail(404, "University not found.");

    const body = await readJson(request);
    const name = optionalString(body?.name, 200) ?? "";
    const invalidName = checkName("Faculty name", name);
    if (invalidName) return fail(400, invalidName);
    const abbreviation = optionalString(body?.abbreviation, 15) || undefined;
    if (abbreviation) {
      const invalid = checkUnitAbbr(abbreviation);
      if (invalid) return fail(400, invalid);
    }

    const Faculty = await getFacultyModel();
    const sameName = await Faculty.findOne({
      universityId: university._id,
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    }).lean<IFaculty>();
    if (sameName?.isActive) return fail(409, "This university already has a faculty with that name.");

    let faculty: IFaculty;
    let status = 201;
    try {
      if (sameName) {
        faculty = (await Faculty.findByIdAndUpdate(
          sameName._id,
          { $set: { isActive: true, ...(abbreviation ? { abbreviation } : {}) } },
          { returnDocument: "after" },
        ).lean<IFaculty>())!;
        status = 200;
      } else {
        faculty = (
          await Faculty.create({
            universityId: university._id,
            universityName: university.name,
            universityAbbr: university.abbreviation,
            name,
            abbreviation,
            addedBy: session.userId,
          })
        ).toObject();
      }
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "This university already has a faculty with that name.");
      throw error;
    }

    await refreshInstitutionCounts(university._id, faculty._id);
    console.info(`admin: @${session.upid} added faculty "${name}" to ${university.abbreviation}`);
    return NextResponse.json({ faculty: toAdminFacultyDto(faculty) }, { status });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/institutions/[id]/faculties");
  }
}
