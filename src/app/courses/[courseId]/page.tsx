// /app/courses/[courseId]/page.tsx
import React from "react";

interface CoursePageProps {
  params: {
    courseId: string;
  };
}

export default function CourseDetailPage({params}: CoursePageProps) {
  const {courseId} = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Course: {courseId}</h1>
      <p className="text-gray-700">
        This is a dynamic course detail page for <strong>{courseId}</strong>.
        You can fetch course details here using an API or local data.
      </p>
    </div>
  );
}
