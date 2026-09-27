// GET  /api/admin/institutions/[id]/faculties/[fid]/departments - all
//        departments of a faculty, removed ones too
// POST /api/admin/institutions/[id]/faculties/[fid]/departments - add one
//   Body: { name, abbreviation? }. A removed department with the same name
//   is restored instead of duplicated.
// Permission: "manage_institution".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { escapeRegex } from "@/lib/escapeRegex";
import { fail, isDuplicateKey, optionalString } from "@/lib/adminApi";
import { getDepartmentModel, type IDepartment } from "@/lib/models/university/departmentModel";
import {
  checkName,
  checkUnitAbbr,
  loadFacultyOf,
  refreshInstitutionCounts,
  toAdminDepartmentDto,
} from "@/lib/institutionAdmin";

type Context = { params: Promise<{ id: string; fid: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "manage_institution");
    const { id, fid } = await context.params;
    const faculty = await loadFacultyOf(id, fid);
    if (!faculty) return fail(404, "Faculty not found.");

    const Department = await getDepartmentModel();
    const departments = await Department.find({ facultyId: faculty._id })
      .sort({ isActive: -1, name: 1 })
      .lean<IDepartment[]>();
    return NextResponse.json(
      { departments: departments.map(toAdminDepartmentDto) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/institutions/[id]/faculties/[fid]/departments");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    enforceRateLimit(request, `admin-institutions:${session.userId}`, 60);
    const { id, fid } = await context.params;
    const faculty = await loadFacultyOf(id, fid);
    if (!faculty) return fail(404, "Faculty not found.");

    const body = await readJson(request);
    const name = optionalString(body?.name, 200) ?? "";
    const invalidName = checkName("Department name", name);
    if (invalidName) return fail(400, invalidName);
    const abbreviation = optionalString(body?.abbreviation, 15) || undefined;
    if (abbreviation) {
      const invalid = checkUnitAbbr(abbreviation);
      if (invalid) return fail(400, invalid);
    }

    const Department = await getDepartmentModel();
    const sameName = await Department.findOne({
      facultyId: faculty._id,
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    }).lean<IDepartment>();
    if (sameName?.isActive) return fail(409, "This faculty already has a department with that name.");

    let department: IDepartment;
    let status = 201;
    try {
      if (sameName) {
        department = (await Department.findByIdAndUpdate(
          sameName._id,
          { $set: { isActive: true, ...(abbreviation ? { abbreviation } : {}) } },
          { returnDocument: "after" },
        ).lean<IDepartment>())!;
        status = 200;
      } else {
        department = (
          await Department.create({
            universityId: faculty.universityId,
            facultyId: faculty._id,
            universityName: faculty.universityName,
            universityAbbr: faculty.universityAbbr,
            facultyName: faculty.name,
            name,
            abbreviation,
            addedBy: session.userId,
          })
        ).toObject();
      }
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "This faculty already has a department with that name.");
      throw error;
    }

    await refreshInstitutionCounts(faculty.universityId, faculty._id);
    console.info(`admin: @${session.upid} added department "${name}" to faculty ${fid}`);
    return NextResponse.json({ department: toAdminDepartmentDto(department) }, { status });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/institutions/[id]/faculties/[fid]/departments");
  }
}
