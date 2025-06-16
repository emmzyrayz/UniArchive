import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { getCourseModel } from '@/models/courseModel';

export async function DELETE(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    const CourseModel = await getCourseModel();
    
    const courseId = params.courseId;
    if (!courseId) {
      return NextResponse.json({ message: 'Missing courseId' }, { status: 400 });
    }
    
    const result = await CourseModel.deleteOne({ courseId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Course deleted successfully' 
    }, { status: 200 });
  } catch (error) {
    console.error('Course delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete course';
    
    return NextResponse.json({ 
      message: errorMessage
    }, { status: 500 });
  }
}