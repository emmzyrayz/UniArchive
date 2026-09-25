// GET /api/institutions/courses?departmentId=&level=&semester=
// Public. Returns active courses for a department, optionally filtered by
// level and semester.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import {
  COURSE_LEVELS,
  SEMESTERS,
  getCourseModel,
  type CourseLevel,
  type Semester,
} from "@/lib/models/courseModel";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const departmentId = searchParams.get("departmentId")?.trim();
    const level = searchParams.get("level")?.trim();
    const semester = searchParams.get("semester")?.trim();

    if (!departmentId || !isValidObjectId(departmentId)) {
      return NextResponse.json(
        { message: "Valid departmentId is required." },
        { status: 400 },
      );
    }
    if (level && !COURSE_LEVELS.includes(level as CourseLevel)) {
      return NextResponse.json(
        { message: `level must be one of: ${COURSE_LEVELS.join(", ")}` },
        { status: 400 },
      );
    }
    if (semester && !SEMESTERS.includes(semester as Semester)) {
      return NextResponse.json(
        { message: `semester must be one of: ${SEMESTERS.join(", ")}` },
        { status: 400 },
      );
    }

    const Course = await getCourseModel();

    const filter: Record<string, unknown> = { departmentId, isActive: true };
    if (level) filter.level = level;
    if (semester) filter.semester = semester;

    const courses = await Course.find(filter)
      .select("courseCode courseName level semester creditUnits isElective")
      .sort({ level: 1, courseCode: 1 })
      .lean();

    return NextResponse.json({ courses });
  } catch (error) {
    return handleRouteError(error, "institutions/courses");
  }
}
