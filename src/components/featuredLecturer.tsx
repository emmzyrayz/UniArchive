"use client";

import React from "react";
import {LecturerCard} from "./reuse/card";

// Photos
import Post1 from "@/assets/img/gallery/lego.jpg";
import Post2 from "@/assets/img/gallery/leica.jpg";
import Post3 from "@/assets/img/gallery/featured2.png";

export const FeaturedLecturer: React.FC = () => {
  // Sample data for featured lecturers
  const featuredLecturers = [
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

  return (
    <div className="flex flex-col gap-4 bg-linear-to-r bbg-black/20 items-center justify-between rounded-[12px] m-2 p-4 mb-4">
      <div className="top">
        <span className='flex w-full text-[22px] font-semibold'>Featured Lecturers</span>
      </div>
      <div className="flex flex-col lg:flex-row items-center justify-center w-[98%]  gap-6">
        {featuredLecturers.map((lecturer, index) => (
          <LecturerCard
            key={index}
            name={lecturer.name}
            title={lecturer.title}
            department={lecturer.department}
            imageUrl={lecturer.imageUrl}
            desc={lecturer.desc}
            specialties={lecturer.specialties}
            slug={lecturer.slug}
          />
        ))}
      </div>
    </div>
  );
};
