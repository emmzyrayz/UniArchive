// GET /api/institutions/faculties?universityId=
// Public. Returns all active faculties for one university.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const universityId = request.nextUrl.searchParams
      .get("universityId")
      ?.trim();

    if (!universityId || !isValidObjectId(universityId)) {
      return NextResponse.json(
        { message: "Valid universityId is required." },
        { status: 400 },
      );
    }

    const Faculty = await getFacultyModel();
    const faculties = await Faculty.find({ universityId, isActive: true })
      .select("name abbreviation totalDepartments")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ faculties });
  } catch (error) {
    return handleRouteError(error, "institutions/faculties");
  }
}
