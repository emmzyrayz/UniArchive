// /app/courses/page.tsx
"use client";
import React from "react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  description: string;
};

const dummyCourses: Course[] = [
  {
    id: "math-101",
    title: "Mathematics 101",
    description: "Intro to basic algebra.",
  },
  {
    id: "cs-201",
    title: "Computer Science 201",
    description: "Data structures & algorithms.",
  },
];

export default function CoursesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dummyCourses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <div className="p-4 border rounded hover:shadow cursor-pointer">
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <p className="text-sm text-gray-600">{course.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
