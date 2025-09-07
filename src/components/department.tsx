"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CardOne } from "./reuse/card";
import { PanInfo, motion, useAnimationControls } from "framer-motion";
import { usePublic } from "@/context/publicContext"; // Import your public context

interface DepartmentData {
  id: string;
  name: string;
  universityName: string;
  universityLogo: string;
  coursesCount: number;
  materialsCount: number;
}

export const TopDepartment = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const lastDragInfoRef = useRef({ x: 0 });
  const [dragX, setDragX] = useState(0);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const controls = useAnimationControls();

  // Use the public context
  const { unifiedData, isLoading, error, refreshData } = usePublic();

  const getRandomDepartments = useCallback(
    (data: typeof unifiedData): DepartmentData[] => {
      const allDepartments: DepartmentData[] = [];

      // Flatten all departments from all universities
      data.forEach((university) => {
        university.faculties.forEach((faculty) => {
          faculty.departments.forEach((department) => {
            // Calculate total courses and materials for this department
            const coursesCount = department.courses.length;
            const materialsCount = department.courses.reduce(
              (total, course) => total + course.materials.length,
              0
            );

            allDepartments.push({
              id: department.id,
              name: department.name,
              universityName: university.name,
              universityLogo: university.logoUrl,
              coursesCount,
              materialsCount,
            });
          });
        });
      });

      // Shuffle and take first 10 (or all if less than 10)
      const shuffled = [...allDepartments].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(10, shuffled.length));
    },
    []
  ); // Empty dependency array since the function doesn't depend on any external variables

  // Update departments when unified data changes
  useEffect(() => {
    if (unifiedData && unifiedData.length > 0) {
      const randomDepartments = getRandomDepartments(unifiedData);
      setDepartments(randomDepartments);
      console.log("Selected departments:", randomDepartments); // For testing
    }
  }, [getRandomDepartments, unifiedData]);

  // Animation settings
  const animationDuration = 30; // seconds

  useEffect(() => {
    const startAnimation = async () => {
      if (isHovering || departments.length === 0) {
        controls.stop();
        return;
      }

      if (isInteracting) {
        // Stop auto-animation when user is interacting
        return;
      }

      setCurrentPosition(dragX);

      if (!containerRef.current) return;

      await controls.start({
        x: [dragX + "%", "-50%"],
        transition: {
          duration: animationDuration * (1 - Math.abs(dragX) / -50),
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    };

    startAnimation();
  }, [controls, isHovering, departments.length, isInteracting, dragX]);

  const handleInteractionStart = () => {
    controls.stop();
    setIsInteracting(true);
  };

  const handleInteractionEnd = () => {
    // When interaction ends, update dragX with final position
    setDragX(currentPosition);
    setIsInteracting(false);
  };

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    // Convert pixel movement to percentage (approximation)
    const containerWidth = containerRef.current?.offsetWidth || 1000;
    const percentDelta = (info.delta.x / containerWidth) * 100;

    // Calculate new position
    const newPosition = currentPosition + percentDelta;

    // Constrain position between 0 and -50%
    const constrainedPosition = Math.min(0, Math.max(-50, newPosition));

    // Update position
    setCurrentPosition(constrainedPosition);
    controls.set({ x: `${constrainedPosition}%` });

    // Save last drag info
    lastDragInfoRef.current = { x: info.delta.x };
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const cardMotionProps = {
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
  };

  // Testing/Debug section - you can remove this in production
  const handleRefreshData = () => {
    console.log("Refreshing data...");
    refreshData();
  };

  const handleLogData = () => {
    console.log("Unified Data:", unifiedData);
    console.log("Departments:", departments);
    console.log("Loading:", isLoading);
    console.log("Error:", error);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
        <div className="top-con flex w-full items-center justify-between px-4">
          <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
            Top Department
          </span>
        </div>
        <div className="w-[95vw] h-[200px] bg-gray-200 rounded-md flex items-center justify-center">
          <span>Loading departments...</span>
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
            Top Department
          </span>
          <button
            onClick={handleRefreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
        <div className="w-[95vw] h-[200px] bg-red-100 rounded-md flex items-center justify-center">
          <span className="text-red-600">Error: {error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (departments.length === 0) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
        <div className="top-con flex w-full items-center justify-between px-4">
          <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
            Top Department
          </span>
          {/* Debug buttons - remove in production */}
          <div className="flex gap-2">
            <button
              onClick={handleLogData}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Debug Log
            </button>
            <button
              onClick={handleRefreshData}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="w-[95vw] h-[200px] bg-gray-100 rounded-md flex items-center justify-center">
          <span>No departments available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
      <div className="top-con flex w-full items-center justify-between px-4">
        <span className="flex items-center justify-center text-[24px] xl:text-[26px] font-bold">
          Top Department ({departments.length})
        </span>

        <div className="flex items-center gap-2">
          {/* Debug buttons - remove in production */}
          <button
            onClick={handleLogData}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
          >
            Debug Log
          </button>
          <button
            onClick={handleRefreshData}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Refresh Data
          </button>
          <div className="more-btn flex items-center justify-center cursor-pointer text-blue-600 hover:underline">
            <span>View All</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="department-con w-[95vw] h-full bg-gray-300 rounded-md overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative flex w-full h-full items-center justify-evenly">
          <motion.div
            className="flex flex-nowrap"
            animate={controls}
            initial={{ x: 0 }}
            style={{ display: "flex", width: "200%" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleInteractionStart}
            onDragEnd={handleInteractionEnd}
            onDrag={handleDrag}
            dragMomentum={false}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
          >
            {/* First set of cards */}
            {departments.map((dept) => (
              <Link
                key={`dept-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card flex-shrink-0 p-2 w-[300px] h-[150px]"
                onClick={(e) => isInteracting && e.preventDefault()}
              >
                <CardOne
                  title={dept.name}
                  description={`${dept.universityName} • ${dept.coursesCount} courses • ${dept.materialsCount} materials`}
                  imageUrl={dept.universityLogo}
                  motionProps={cardMotionProps}
                  layout="left"
                  className="w-full h-full"
                />
              </Link>
            ))}

            {/* Duplicated set of cards for infinite scroll effect */}
            {departments.map((dept) => (
              <Link
                key={`dept-dup-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card flex-shrink-0 p-2 w-[300px] h-[150px]"
              >
                <CardOne
                  title={dept.name}
                  description={`${dept.universityName} • ${dept.coursesCount} courses • ${dept.materialsCount} materials`}
                  imageUrl={dept.universityLogo}
                  motionProps={cardMotionProps}
                  layout="left"
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
