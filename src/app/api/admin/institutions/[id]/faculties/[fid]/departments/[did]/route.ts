// PATCH  /api/admin/institutions/[id]/faculties/[fid]/departments/[did]
//   Body (any of): { name, abbreviation, isActive }. "" clears abbreviation.
//   A new name is copied to users and materials.
// DELETE /api/admin/institutions/[id]/faculties/[fid]/departments/[did]
//   Soft delete (isActive: false). Users and materials keep their references.
// Permission: "manage_institution".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { fail, isDuplicateKey, optionalString } from "@/lib/adminApi";
import { getDepartmentModel, type IDepartment } from "@/lib/models/university/departmentModel";
import {
  cascadeDepartmentRename,
  checkName,
  checkUnitAbbr,
  loadDepartmentOf,
  loadFacultyOf,
  refreshInstitutionCounts,
  toAdminDepartmentDto,
} from "@/lib/institutionAdmin";

type Context = { params: Promise<{ id: string; fid: string; did: string }> };

async function load(context: Context) {
  const { id, fid, did } = await context.params;
  const faculty = await loadFacultyOf(id, fid);
  return faculty ? loadDepartmentOf(String(faculty._id), did) : null;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    enforceRateLimit(request, `admin-institutions:${session.userId}`, 60);
    const current = await load(context);
    if (!current) return fail(404, "Department not found.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");
    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    if (body.name !== undefined) {
      const name = optionalString(body.name, 200) ?? "";
      const invalid = checkName("Department name", name);
      if (invalid) return fail(400, invalid);
      if (name !== current.name) set.name = name;
    }
    if (body.abbreviation !== undefined) {
      const abbr = optionalString(body.abbreviation, 15);
      if (abbr === null) return fail(400, "Abbreviation must be 1-15 characters.");
      if (abbr) {
        const invalid = checkUnitAbbr(abbr);
        if (invalid) return fail(400, invalid);
        set.abbreviation = abbr;
      } else {
        unset.abbreviation = "";
      }
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") return fail(400, "isActive must be true or false.");
      set.isActive = body.isActive;
    }
    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return NextResponse.json({ department: toAdminDepartmentDto(current) });
    }

    const Department = await getDepartmentModel();
    let updated: IDepartment | null;
    try {
      updated = await Department.findByIdAndUpdate(
        current._id,
        {
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { returnDocument: "after" },
      ).lean<IDepartment>();
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "This faculty already has a department with that name.");
      throw error;
    }
    if (!updated) return fail(404, "Department not found.");

    if (set.name) await cascadeDepartmentRename(updated._id, updated.name);
    if (set.isActive !== undefined) await refreshInstitutionCounts(updated.universityId, updated.facultyId);
    console.info(`admin: @${session.upid} edited department ${String(updated._id)}: ${Object.keys({ ...set, ...unset }).join(", ")}`);
    return NextResponse.json({ department: toAdminDepartmentDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/institutions/[id]/faculties/[fid]/departments/[did]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    enforceRateLimit(request, `admin-institutions:${session.userId}`, 60);
    const current = await load(context);
    if (!current) return fail(404, "Department not found.");

    const Department = await getDepartmentModel();
    await Department.updateOne({ _id: current._id }, { $set: { isActive: false } });
    await refreshInstitutionCounts(current.universityId, current.facultyId);
    console.info(`admin: @${session.upid} removed department ${String(current._id)} (${current.name})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/institutions/[id]/faculties/[fid]/departments/[did]");
  }
}
