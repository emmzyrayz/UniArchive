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
    const filterableFields = ['schoolId', 'facultyId', 'departmentId', 'level', 'semester'] as const;
    filterableFields.forEach(field => {
      const value = searchParams.get(field);
      if (value) filter[field] = value;
    });
    
    // Search filter
    if (searchParams.get('search')) {
      const q = searchParams.get('search') as string;
      filter.$or = [
        { courseName: { $regex: q, $options: 'i' } },
        { courseCode: { $regex: q, $options: 'i' } },
        { departmentName: { $regex: q, $options: 'i' } },
        { facultyName: { $regex: q, $options: 'i' } },
        { schoolName: { $regex: q, $options: 'i' } },
      ];
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;
    
    // Execute query
    const [total, courses] = await Promise.all([
      CourseModel.countDocuments(filter),
      CourseModel.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
    ]);
    
    return NextResponse.json({ 
      courses, 
      pagination: { 
        currentPage: page, 
        totalPages: Math.ceil(total / limit), 
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      } 
    }, { status: 200 });
  } catch (error) {
    console.error('Course fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch courses';
    return NextResponse.json({ 
      message: errorMessage
    }, { status: 500 });
  }
}