import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { getCourseModel, CourseOutlineWeek } from '@/models/courseModel';

// Type for the incoming request data
interface CourseUploadData {
  courseName: string;
  courseCode: string;
  courseOutline?: CourseOutlineWeek[] | string;
  creditUnit?: number;
  semester?: 'First' | 'Second' | 'Annual';
  level: string;
  schoolId: string;
  schoolName: string;
  facultyId: string;
  facultyName: string;
  departmentId: string;
  departmentName: string;
}

export async function POST(req: NextRequest) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    const CourseModel = await getCourseModel();
    
    const data: CourseUploadData = await req.json();
    
    // Validation
    const requiredFields: (keyof CourseUploadData)[] = ['courseName', 'courseCode', 'schoolId', 'facultyId', 'departmentId', 'level'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        message: 'Missing required fields', 
        missingFields 
      }, { status: 400 });
    }

    // Parse courseOutline if it's a string
    if (data.courseOutline && typeof data.courseOutline === 'string') {
      try {
        data.courseOutline = JSON.parse(data.courseOutline);
      } catch {
        return NextResponse.json({ 
          message: 'Invalid courseOutline format - must be valid JSON' 
        }, { status: 400 });
      }
    }

    // Validate courseOutline structure if present
    if (data.courseOutline) {
      if (!Array.isArray(data.courseOutline)) {
        return NextResponse.json({ 
          message: 'courseOutline must be an array' 
        }, { status: 400 });
      }
      // New nested structure validation
      const hasValidStructure = data.courseOutline.every(week =>
        week &&
        typeof week.weekId === 'string' &&
        typeof week.index === 'number' &&
        Array.isArray(week.topics) &&
        week.topics.every(topic =>
          topic &&
          typeof topic.id === 'string' &&
          typeof topic.name === 'string' &&
          Array.isArray(topic.subtopics) &&
          topic.subtopics.every(sub =>
            sub && typeof sub.id === 'string' && (typeof sub.name === 'string' || typeof sub.name === 'undefined')
          )
        )
      );
      if (!hasValidStructure) {
        return NextResponse.json({
          message: 'Invalid courseOutline structure. Each week must have weekId (string), index (number), topics (array of {id, name, subtopics: [{id, name}]})'
        }, { status: 400 });
      }
    }

    // Create new course
    const newCourse = await CourseModel.create(data);
    return NextResponse.json({ 
      message: 'Course uploaded successfully', 
      course: newCourse 
    }, { status: 201 });
  } catch (error) {
    console.error('Course upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload course';
    const errorDetails = error instanceof Error && 'errors' in error 
      ? (error as Error & { errors?: unknown }).errors 
      : null;
    
    return NextResponse.json({ 
      message: errorMessage,
      errorDetails
    }, { status: 500 });
  }
}