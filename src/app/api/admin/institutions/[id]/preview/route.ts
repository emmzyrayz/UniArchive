// GET /api/admin/institutions/[id]/preview
// A quick look at a university, for comparing a possible-duplicate school
// suggestion against it: details, counts, and its first 5 faculties.
// Permission: "manage_institution".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { getFacultyModel, type IFaculty } from "@/lib/models/university/facultyModel";
import { loadUniversity } from "@/lib/institutionAdmin";
import type { UniversityPreview } from "@/types/admin";

type Context = { params: Promise<{ id: string }> };

const PREVIEW_FACULTIES = 5;

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "manage_institution");
    const university = await loadUniversity((await context.params).id);
    if (!university) return fail(404, "University not found.");

    const Faculty = await getFacultyModel();
    const faculties = await Faculty.find({ universityId: university._id, isActive: true })
      .sort({ name: 1 })
      .limit(PREVIEW_FACULTIES)
      .select("name totalDepartments")
      .lean<Pick<IFaculty, "_id" | "name" | "totalDepartments">[]>();

    const preview: UniversityPreview = {
      id: String(university._id),
      name: university.name,
      abbreviation: university.abbreviation,
      state: university.state,
      city: university.city,
      ownership: university.ownership,
      type: university.type,
      isActive: university.isActive,
      totalFaculties: university.totalFaculties ?? 0,
      totalDepartments: university.totalDepartments ?? 0,
      verificationStatus: university.verificationStatus,
      faculties: faculties.map((f) => ({
        id: String(f._id),
        name: f.name,
        totalDepartments: f.totalDepartments ?? 0,
      })),
    };
    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/institutions/[id]/preview");
  }
}
