"use client";

import {useRef, useState, useEffect} from "react";
// import Image from "next/image";

// Photos
import Post1 from "@/assets/img/gallery/lego.jpg";
import Post2 from "@/assets/img/gallery/leica.jpg";
import Post3 from "@/assets/img/gallery/featured2.png";
import Link from "next/link";
import {CardOne} from "./reuse/card";
import {motion, useAnimationControls, PanInfo} from "framer-motion";

export const TopFaculty = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const lastDragInfoRef = useRef({x: 0});
  const [dragX, setDragX] = useState(0);
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

      if (isInteracting) {
        // Stop auto-animation when user is interacting
        return;
      }

      setCurrentPosition(dragX);

      // Get width of the scroll container for proper animation
      if (!containerRef.current) return;

      // Animation sequence for infinite loop
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
  }, [controls, isHovering, isInteracting, dragX]);

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
    controls.set({x: `${constrainedPosition}%`});

    // Save last drag info
    lastDragInfoRef.current = {x: info.delta.x};
  };

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
            drag="x"
            dragConstraints={{left: 0, right: 0}}
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
            {faculty.map((dept) => (
              <Link
                key={`dept-${dept.id}`}
                href={`/department/${dept.id}`}
                className="department-card flex-shrink-0 p-2 h-[300px] w-[250px]"
                onClick={(e) => isInteracting && e.preventDefault()} // Prevent navigation during drag
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
                onClick={(e) => isInteracting && e.preventDefault()} // Prevent navigation during drag
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