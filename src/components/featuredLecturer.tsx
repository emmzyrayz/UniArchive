"use client";

import React, { useEffect, useRef, useState } from "react";
import {LecturerCard } from "./reuse/card";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import {StaticImageData} from "next/image";

// Photos
import Post1 from "@/assets/img/gallery/lego.jpg";
import Post2 from "@/assets/img/gallery/leica.jpg";
import Post3 from "@/assets/img/gallery/featured2.png";

 const featuredLecturers: Lecturer[] = [
    {
      name: "Dr. Jane Okafor",
      title: "Senior Lecturer",
      department: "Computer Science",
      imageUrl: Post1,
      desc: "Expert in AI and machine learning with over 10 years of industry experience.",
      specialties: [
        "Artificial Intelligence",
        "Machine Learning",
        "Data Science",
      ],
      slug: "dr-jane-okafor",
    },
    {
      name: "Prof. Samuel Adekunle",
      title: "Professor",
      department: "Software Engineering",
      imageUrl: Post2,
      desc: "Leading researcher in software architecture and systems design.",
      specialties: [
        "Software Architecture",
        "Systems Design",
        "Cloud Computing",
      ],
      slug: "prof-samuel-adekunle",
    },
    {
      name: "Dr. Amina Hassan",
      title: "Associate Professor",
      department: "Cybersecurity",
      imageUrl: Post3,
      desc: "Specializes in network security and ethical hacking methodologies.",
      specialties: ["Cybersecurity", "Network Security", "Ethical Hacking"],
      slug: "dr-amina-hassan",
    },
  ];

// Define the lecturer type for TypeScript
interface Lecturer {
  name: string;
  title: string;
  department: string;
  imageUrl: string| StaticImageData; // Using 'any' for imported image types
  desc?: string;
  specialties?: string[];
  slug: string;
}

// Define the lecturer type for TypeScript


export const ScrollableLecturer: React.FC = () => {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check if arrows should be shown based on scroll position
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setShowLeftArrow(container.scrollLeft > 20);
    setShowRightArrow(container.scrollLeft < (container.scrollWidth - container.clientWidth - 20));
  };

   useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      // Initialize arrow visibility
      checkScrollPosition();
      
      // Also check on window resize as it might affect scrollability
      window.addEventListener('resize', checkScrollPosition);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollPosition);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Use the actual card width for better scroll behavior
    const cardWidth = 350; // md:w-[350px] from your component
    const gap = 24; // gap-6 in Tailwind is 1.5rem = 24px
    const scrollAmount = cardWidth + gap;
    
    container.scrollTo({
      left: direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount,
      behavior: 'smooth'
    });
  };

  // Sample data for featured lecturers

  return (
    <div className="flex flex-col gap-4 bg-linear-to-r bg-black/20 items-center justify-between rounded-[12px] m-2 p-4 mb-4">
      <div className="top">
        <span className='flex w-full text-[22px] font-semibold'>Featured Lecturers</span>
      </div>
      <div className="relative w-full max-w-full py-4">
      {/* Left scroll button */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-md"
          aria-label="Scroll left"
        >
          <LuChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
      )}
      
      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-6 pb-4 px-4 scrollbar-hide scroll-smooth snap-x"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {featuredLecturers.map((lecturer, index) => (
          <div key={index} className="snap-center flex-shrink-0">
            <LecturerCard
              name={lecturer.name}
              title={lecturer.title}
              department={lecturer.department}
              imageUrl={lecturer.imageUrl}
              desc={lecturer.desc}
              specialties={lecturer.specialties}
              slug={lecturer.slug}
            />
          </div>
        ))}
      </div>
      
      {/* Right scroll button */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-md"
          aria-label="Scroll right"
        >
          <LuChevronRight className="h-6 w-6 text-gray-700" />
        </button>
      )}

      {/* Custom scroll indicator dots */}
      <div className="flex justify-center mt-4 gap-1">
        {/* Optional: Add scroll indicator dots if needed */}
      </div>
    </div>
    </div>
  );
};
