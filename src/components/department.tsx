"use client";

import {useRef, useState, useEffect} from "react";
import Image from "next/image";

// Photos
import Post1 from "@/assets/img/gallery/lego.jpg";
import Post2 from "@/assets/img/gallery/leica.jpg";
import Post3 from "@/assets/img/gallery/featured2.png";
import Link from "next/link";
import {CardOne} from "./ui/card";
import {motion, useAnimationControls} from "framer-motion";

export const TopDepartment = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimationControls();

  // Generate department data to keep code DRY
  const departments = [
    {
      id: 1,
      imageUrl: Post1,
      title: "Department Name",
      description: "Lorem ipsum dolor sit amet elit. Quas, voluptatibus?",
    },
    {
      id: 2,
      imageUrl: Post2,
      title: "Department Name",
      description: "Lorem ipsum dolor sit elit. Quas, voluptatibus?",
    },
    {
      id: 3,
      imageUrl: Post3,
      title: "Department Name",
      description: "Lorem ipsum dolor elit. Quas, voluptatibus?",
    },
    {
      id: 4,
      imageUrl: Post1,
      title: "Department Name",
      description: "Lorem ipsum dolor sit amet elit. Quas, voluptatibus?",
    },
    {
      id: 5,
      imageUrl: Post2,
      title: "Department Name",
      description: "Lorem ipsum dolor sit elit. Quas, voluptatibus?",
    },
    {
      id: 6,
      imageUrl: Post3,
      title: "Department Name",
      description: "Lorem ipsum dolor elit. Quas, voluptatibus?",
    },
  ];

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

      // Animation sequence for infinite loop
      await controls.start({
        x: `-100%`,
        transition: {
          duration: animationDuration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    };

    startAnimation();
  }, [controls, isHovering]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const cardMotionProps = {
    whileHover: {scale: 1.05, transition: {duration: 0.2}},
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-center gap-3 p-4">
      <span className="flex w-full items-center justify-center text-[24px] xl:text-[26px] font-bold">
        Top Department
      </span>

      <div
        ref={containerRef}
        className="department-con w-[95vw] h-full bg-gray-300 rounded-md overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative flex w-full h-full">
          <motion.div
            className="flex flex-row gap-3 px-4 py-2"
            animate={controls}
            style={{display: "flex", width: "200%"}} // Double width for seamless loop
          >
            {/* First set of cards */}
            {departments.map((dept) => (
              <Link
                key={`dept-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card"
              >
                <CardOne
                  title={dept.title}
                  description={dept.description}
                  imageUrl={dept.imageUrl}
                  motionProps={cardMotionProps}
                  layout="left"
                  className="w-[300px] h-[150px]"
                />
              </Link>
            ))}

            {/* Duplicated set of cards for infinite scroll effect */}
            {departments.map((dept) => (
              <Link
                key={`dept-dup-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card"
              >
                <CardOne
                  title={dept.title}
                  description={dept.description}
                  imageUrl={dept.imageUrl}
                  motionProps={cardMotionProps}
                  layout="left"
                  className="w-[300px] h-[150px]"
                />
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};


export const TopFalculty = () => {
    return(
        <div className=''></div>
    )
}