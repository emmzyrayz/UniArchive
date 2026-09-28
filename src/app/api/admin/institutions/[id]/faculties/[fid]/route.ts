// PATCH  /api/admin/institutions/[id]/faculties/[fid] - edit
//   Body (any of): { name, abbreviation, isActive }. "" clears abbreviation.
//   A new name is copied to its departments, users and materials.
// DELETE /api/admin/institutions/[id]/faculties/[fid] - soft delete
//   (isActive: false). Users and materials keep their references.
// Permission: "manage_institution".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey, optionalString } from "@/lib/adminApi";
import { getFacultyModel, type IFaculty } from "@/lib/models/university/facultyModel";
import {
  cascadeFacultyRename,
  checkName,
  checkUnitAbbr,
  loadFacultyOf,
  refreshInstitutionCounts,
  toAdminFacultyDto,
} from "@/lib/institutionAdmin";

type Context = { params: Promise<{ id: string; fid: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    await enforceRateLimit(request, "admin", `admin-institutions:${session.userId}`);
    const { id, fid } = await context.params;
    const current = await loadFacultyOf(id, fid);
    if (!current) return fail(404, "Faculty not found.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");
    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    if (body.name !== undefined) {
      const name = optionalString(body.name, 200) ?? "";
      const invalid = checkName("Faculty name", name);
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
      return NextResponse.json({ faculty: toAdminFacultyDto(current) });
    }

    const Faculty = await getFacultyModel();
    let updated: IFaculty | null;
    try {
      updated = await Faculty.findByIdAndUpdate(
        current._id,
        {
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { returnDocument: "after" },
      ).lean<IFaculty>();
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "This university already has a faculty with that name.");
      throw error;
    }
    if (!updated) return fail(404, "Faculty not found.");

    if (set.name) await cascadeFacultyRename(updated._id, updated.name);
    if (set.isActive !== undefined) await refreshInstitutionCounts(updated.universityId, updated._id);
    console.info(`admin: @${session.upid} edited faculty ${fid}: ${Object.keys({ ...set, ...unset }).join(", ")}`);
    return NextResponse.json({ faculty: toAdminFacultyDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/institutions/[id]/faculties/[fid]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    await enforceRateLimit(request, "admin", `admin-institutions:${session.userId}`);
    const { id, fid } = await context.params;
    const current = await loadFacultyOf(id, fid);
    if (!current) return fail(404, "Faculty not found.");

    const Faculty = await getFacultyModel();
    await Faculty.updateOne({ _id: current._id }, { $set: { isActive: false } });
    await refreshInstitutionCounts(current.universityId, current._id);
    console.info(`admin: @${session.upid} removed faculty ${fid} (${current.name})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/institutions/[id]/faculties/[fid]");
  }
}
