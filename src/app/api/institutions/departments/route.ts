// GET /api/institutions/departments?facultyId=&universityId=
// Public. Returns all active departments for a faculty within a university.
// Both ids are required so a department can never leak across universities.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const facultyId = searchParams.get("facultyId")?.trim();
    const universityId = searchParams.get("universityId")?.trim();

    if (
      !facultyId ||
      !isValidObjectId(facultyId) ||
      !universityId ||
      !isValidObjectId(universityId)
    ) {
      return NextResponse.json(
        { message: "Valid facultyId and universityId are required." },
        { status: 400 },
      );
    }

    const Department = await getDepartmentModel();
    const departments = await Department.find({
      facultyId,
      universityId,
      isActive: true,
    })
      .select("name abbreviation totalCourses")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ departments });
  } catch (error) {
    return handleRouteError(error, "institutions/departments");
  }
}
