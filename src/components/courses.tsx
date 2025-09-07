"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { CardOne } from "./reuse/card";
import { motion, useAnimationControls } from "framer-motion";
import { usePublic } from "@/context/publicContext";

interface CourseCardData {
  id: string;
  title: string;
  code: string;
  description: string;
  imageUrl: string;
  universityName: string;
  facultyName: string;
  departmentName: string;
  materialCount: number;
  level?: string;
  semester?: string;
}

export const TopCourse = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimationControls();

  // Fetch data from public context
  const { unifiedData, isLoading, error } = usePublic();
  const [courseData, setCourseData] = useState<CourseCardData[]>([]);

  // Process unified data to extract top 10 courses
  useEffect(() => {
    if (unifiedData && unifiedData.length > 0) {
      const allCourses: CourseCardData[] = [];

      unifiedData.forEach((university) => {
        university.faculties.forEach((faculty) => {
          faculty.departments.forEach((department) => {
            department.courses.forEach((course) => {
              allCourses.push({
                id: course.id,
                title: course.name,
                code: course.code,
                description: `${course.code} - ${course.materials.length} materials available`,
                imageUrl: university.logoUrl, // Use university logo for course cards
                universityName: university.name,
                facultyName: faculty.name,
                departmentName: department.name,
                materialCount: course.materials.length,
                level: course.level,
                semester: course.semester,
              });
            });
          });
        });
      });

      // Sort by material count (descending) and take top 10
      const topCourses = allCourses
        .sort((a, b) => b.materialCount - a.materialCount)
        .slice(0, 10);

      setCourseData(topCourses);
    }
  }, [unifiedData]);

  // Animation settings
  const animationDuration = 30; // seconds

  useEffect(() => {
    const startAnimation = async () => {
      if (isHovering) {
        controls.stop();
        return;
      }

      // Get width of the scroll container for proper animation
      if (!containerRef.current) return;

      // Only start animation if we have data
      if (courseData.length === 0) return;

      // Animation sequence for infinite loop
      await controls.start({
        x: [0, "-50%"],
        transition: {
          duration: animationDuration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    };

    startAnimation();
  }, [controls, isHovering, courseData]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const cardMotionProps = {
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
        <div className="top-con flex w-full items-center justify-between px-4">
          <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
            Top Course
          </span>
          <div className="more-btn flex items-center justify-center cursor-pointer text-blue-600 hover:underline">
            <span>View All</span>
          </div>
        </div>
        <div className="Faculty-con w-[95vw] h-[320px] flex items-center justify-center bg-gray-300 rounded-md">
          <div className="text-gray-600">Loading courses...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
        <div className="top-con flex w-full items-center justify-between px-4">
          <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
            Top Course
          </span>
          <div className="more-btn flex items-center justify-center cursor-pointer text-blue-600 hover:underline">
            <span>View All</span>
          </div>
        </div>
        <div className="Faculty-con w-[95vw] h-[320px] flex items-center justify-center bg-gray-300 rounded-md">
          <div className="text-red-600">Error loading courses: {error}</div>
        </div>
      </div>
    );
  }

  // No data state
  if (courseData.length === 0) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
        <div className="top-con flex w-full items-center justify-between px-4">
          <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
            Top Course
          </span>
          <div className="more-btn flex items-center justify-center cursor-pointer text-blue-600 hover:underline">
            <span>View All</span>
          </div>
        </div>
        <div className="Faculty-con w-[95vw] h-[320px] flex items-center justify-center bg-gray-300 rounded-md">
          <div className="text-gray-600">No courses available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
      <div className="top-con flex w-full items-center justify-between px-4">
        <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
          Top Course
        </span>

        <div className="more-btn flex items-center justify-center cursor-pointer text-blue-600 hover:underline">
          <span>View All</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="Faculty-con w-[95vw] h-[320px] items-center justify-center bg-gray-300 rounded-md overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative flex w-full h-full items-center justify-center">
          <motion.div
            className="flex flex-nowrap"
            animate={controls}
            initial={{ x: 0 }}
            style={{ display: "flex", width: "200%" }} // Double width for seamless loop
          >
            {/* First set of cards */}
            {courseData.map((course) => (
              <Link
                key={`course-${course.id}`}
                href={`/course/${course.id}`}
                className="department-card flex-shrink-0 p-2 h-[300px] w-[250px]"
              >
                <CardOne
                  title={course.title}
                  description={course.description}
                  imageUrl={course.imageUrl}
                  motionProps={cardMotionProps}
                  layout="top"
                  className="h-full w-full"
                />
              </Link>
            ))}

            {/* Duplicated set of cards for infinite scroll effect */}
            {courseData.map((course) => (
              <Link
                key={`course-dup-${course.id}`}
                href={`/course/${course.id}`}
                className="department-card flex-shrink-0 p-2 h-[300px] w-[250px]"
              >
                <CardOne
                  title={course.title}
                  description={course.description}
                  imageUrl={course.imageUrl}
                  motionProps={cardMotionProps}
                  layout="top"
                  className="w-full h-full"
                />
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
