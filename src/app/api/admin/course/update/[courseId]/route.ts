import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { getCourseModel, CourseOutlineWeek, CourseOutlineTopic, CourseOutlineSubtopic } from '@/models/courseModel';

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    const CourseModel = await getCourseModel();
    
    // Await the params Promise
    const courseId = (await params).courseId;

    if (!courseId) {
      return NextResponse.json({ message: 'Missing courseId' }, { status: 400 });
    }
    
    const data = await req.json();
    
    // Validate new courseOutline structure if present
    if (data.courseOutline) {
      if (!Array.isArray(data.courseOutline)) {
        return NextResponse.json({ 
          message: 'courseOutline must be an array' 
        }, { status: 400 });
      }
      const hasValidStructure = data.courseOutline.every((week: CourseOutlineWeek) =>
        week &&
        typeof week.weekId === 'string' &&
        typeof week.index === 'number' &&
        Array.isArray(week.topics) &&
        week.topics.every((topic: CourseOutlineTopic) =>
          topic &&
          typeof topic.id === 'string' &&
          typeof topic.name === 'string' &&
          Array.isArray(topic.subtopics) &&
          topic.subtopics.every((sub: CourseOutlineSubtopic) =>
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
    
    // Prevent changing immutable fields
    const immutableFields = ['courseId', 'schoolId', 'facultyId', 'departmentId'];
    immutableFields.forEach(field => {
      if (data[field]) delete data[field];
    });

    const updated = await CourseModel.findOneAndUpdate(
      { courseId }, 
      data, 
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Course updated successfully', 
      course: updated 
    }, { status: 200 });
  } catch (error) {
    console.error('Course update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update course';
    const errorDetails = error instanceof Error && 'errors' in error 
      ? (error as Error & { errors?: unknown }).errors 
      : null;
    
    return NextResponse.json({ 
      message: errorMessage,
      errorDetails
    }, { status: 500 });
  }
}