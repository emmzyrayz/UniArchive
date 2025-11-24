import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { getCourseModel } from '@/models/courseModel';

// Define proper types
interface CourseFilter {
  schoolId?: string;
  facultyId?: string;
  departmentId?: string;
  level?: string;
  semester?: string;
  status?: string;
  $or?: Array<{
    [key: string]: { $regex: string; $options: string };
  }>;
}

export async function GET(req: NextRequest) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    const CourseModel = await getCourseModel();

    const { searchParams } = new URL(req.url);
    const filter: CourseFilter = {};

    // Apply filters
    const filterableFields = [
      "schoolId",
      "facultyId",
      "departmentId",
      "level",
      "semester",
    ] as const;
    filterableFields.forEach((field) => {
      const value = searchParams.get(field);
      if (value) filter[field] = value;
    });

    // Search filter
    if (searchParams.get("search")) {
      const q = searchParams.get("search") as string;
      filter.$or = [
        { courseName: { $regex: q, $options: "i" } },
        { courseCode: { $regex: q, $options: "i" } },
        { departmentName: { $regex: q, $options: "i" } },
        { facultyName: { $regex: q, $options: "i" } },
        { schoolName: { $regex: q, $options: "i" } },
      ];
    }

    // Pagination - handle limit: 0 as "no limit"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "0" ? 0 : parseInt(limitParam || "50", 10);

    let query = CourseModel.find(filter).sort({ createdAt: -1 }).lean();

    // Apply pagination only if limit > 0
    if (limit > 0) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }

    // Execute query
    const [total, courses] = await Promise.all([
      CourseModel.countDocuments(filter),
      query,
    ]);

    // Build pagination response
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit || total,
      hasNextPage: limit > 0 ? page < totalPages : false,
      hasPrevPage: page > 1,
    };

    console.log("Course API Response:", {
      coursesCount: courses.length,
      total,
      filter,
      limit,
      pagination,
    });

    return NextResponse.json(
      {
        courses,
        pagination,
        statistics: {
          totalCourses: total,
          approvedCourses: total, // Adjust based on your needs
          pendingCourses: 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Course fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch courses';
    return NextResponse.json({ 
      message: errorMessage
    }, { status: 500 });
  }
}