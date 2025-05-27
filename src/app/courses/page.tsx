// /courses/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Course {
  uuid: string;
  name: string;
  code: string;
  department: string;
  description: string;
}

const mockCourses: Course[] = [
  {
    uuid: 'eng101',
    name: 'Introduction to Engineering',
    code: 'ENG 101',
    department: 'Engineering',
    description: 'Basic engineering principles and ethics.',
  },
  {
    uuid: 'bio204',
    name: 'Cell Biology',
    code: 'BIO 204',
    department: 'Biological Sciences',
    description: 'Study of cell structures and their functions.',
  },
  // Add more...
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    // Simulate API call
    setCourses(mockCourses);
  }, []);

  return (
    <main className="container mx-auto pt-[70px] px-4 pb-20">
      <h1 className="text-3xl font-bold text-center mb-8">All Courses</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <Link key={course.uuid} href={`/courses/${course.uuid}`}>
            <div className="bg-white border shadow-sm hover:shadow-md transition-all duration-200 rounded-lg p-4 cursor-pointer">
              <h2 className="text-lg font-bold text-gray-800">{course.name}</h2>
              <p className="text-sm text-gray-600">{course.code} - {course.department}</p>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{course.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
