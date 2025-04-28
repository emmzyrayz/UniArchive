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

export const TopFaculty = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimationControls();

  // Generate department data to keep code DRY
  const faculty = [
    {
      id: 1,
      imageUrl: Post1,
      title: "Faculty Name",
      description: "Lorem ipsum dolor sit amet elit. Quas, voluptatibus?",
    },
    {
      id: 2,
      imageUrl: Post2,
      title: "Faculty Name",
      description: "Lorem ipsum dolor sit elit. Quas, voluptatibus?",
    },
    {
      id: 3,
      imageUrl: Post3,
      title: "Faculty Name",
      description: "Lorem ipsum dolor elit. Quas, voluptatibus?",
    },
    {
      id: 4,
      imageUrl: Post1,
      title: "Faculty Name",
      description: "Lorem ipsum dolor sit amet elit. Quas, voluptatibus?",
    },
    {
      id: 5,
      imageUrl: Post2,
      title: "Faculty Name",
      description: "Lorem ipsum dolor sit elit. Quas, voluptatibus?",
    },
    {
      id: 6,
      imageUrl: Post3,
      title: "Faculty Name",
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
      <div className="top-con flex w-full items-center justify-between px-4">
        <span className="flex  items-center justify-center text-[24px] xl:text-[26px] font-bold">
          Top Faculty
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
            initial={{x: 0}}
            style={{display: "flex", width: "200%"}} // Double width for seamless loop
          >
            {/* First set of cards */}
            {faculty.map((dept) => (
              <Link
                key={`dept-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card flex-shrink-0 p-2 h-[300px] w-[250px]"
              >
                <CardOne
                  title={dept.title}
                  description={dept.description}
                  imageUrl={dept.imageUrl}
                  motionProps={cardMotionProps}
                  layout="top"
                  className="h-full w-full"
                />
              </Link>
            ))}

            {/* Duplicated set of cards for infinite scroll effect */}
            {faculty.map((dept) => (
              <Link
                key={`dept-dup-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card flex-shrink-0 p-2 h-[300px] w-[250px]"
              >
                <CardOne
                  title={dept.title}
                  description={dept.description}
                  imageUrl={dept.imageUrl}
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