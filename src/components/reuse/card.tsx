'use client';

// src/components/ui/card.tsx
import React from "react";
import Image, {StaticImageData} from "next/image";
import {motion, MotionProps} from "framer-motion";
import Link from "next/link";

interface BaseCardProps {
  title: string;
  description?: string;
  className?: string;
  imageUrl?: string | StaticImageData;
  motionProps?: MotionProps;
  layout?: "top" | "left"; // for CardOne only
}

type LecturerCardProps = {
  name: string;
  title: string;
  department: string;
  imageUrl: string | StaticImageData;
  desc?: string; // Made optional
  specialties?: string[]; // Changed from list() function to array
  slug: string; // e.g., "dr-jane-okafor"
};


// Card One: image left or top with text
export const CardOne = ({
  title,
  description,
  className,
  imageUrl,
  motionProps,
  layout = "top",
}: BaseCardProps) => {
  return (
    <motion.div
      {...motionProps}
      className={`flex items-center ${
        layout === "left"
          ? "flex-row justify-between "
          : "flex-col justify-center w-full"
      } bg-white rounded-xl shadow-md hover:shadow-lg overflow-hidden   border-gray-300 border-[2px] cursor-pointer ${className}`}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          width={layout === "left" ? 100 : 400}
          height={layout === "left" ? 100 : 500}
          className={`object-fit ${
            layout === "left"
              ? "min-w-[40%] h-full"
              : "w-full min-h-[60%] rounded-b-[8px]"
          } `}
        />
      )}

      <div
        className={`${
          layout === "left" ? "min-w-[60%] " : "w-auto"
        } p-4  h-full flex flex-col items-center justify-center `}
      >
        <h3 className="text-[14px] xl:text-[16px] font-bold">{title}</h3>
        {description && (
          <p className="text-[12px] xl:text-[14px] text-gray-600 mt-2">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Card Two: image behind with overlay
export const CardTwo = ({
  title,
  description,
  className,
  imageUrl,
  motionProps,
}: BaseCardProps) => {
  return (
    <motion.div
      {...motionProps}
      className={`relative border-gray-300 border-[2px] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl cursor-pointer ${className}`}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          width={500}
          height={300}
          className="object-fit w-full h-full"
        />
      )}
      <div className="absolute inset-0 bg-black/20 bg-opacity-50 backdrop-blur-[2px] hover:backdrop-blur-sm flex flex-col justify-center items-center p-4">
        <h3 className="text-white text-[22px] xl:text-[24px] font-bold text-center">
          {title}
        </h3>
        {description && (
          <p className="text-white text-[12px] xl:text-[14px] text-center mt-2">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Card Three: no image
export const CardThree = ({
  title,
  description,
  className,
  motionProps,
}: BaseCardProps) => {
  return (
    <motion.div
      {...motionProps}
      className={`flex flex-col items-center justify-center border-gray-300 border-[2px] bg-white p-6 rounded-xl shadow-md ${className}`}
    >
      <h3 className="text-[16px] xl:text-[18px] font-bold">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      )}
    </motion.div>
  );
};

export const LecturerCard = ({
  name,
  title,
  department,
  imageUrl,
  specialties = ["Artificial Intelligence", "Software Engineering"], // Default specialties
  desc = "", // Default empty description
  slug,
}: LecturerCardProps) => {
  return (
    <Link href={`/lecturers/${slug}`} className="block h-[350px]">
      <div className="flex flex-col w-[250px] md:w-[350px] min-h-[300px] h-full bg-white shadow-md rounded-xl p-4 hover:shadow-lg hover:scale-105 transition-all duration-500 ease-in-out gap-4 items-center justify-evenly">
        <div className="flex w-full h-1/3 items-center justify-center">
          <Image
            src={imageUrl}
            alt={name}
            width={80}
            height={80}
            className="rounded-[12px] object-cover w-full h-full"
          />
        </div>
        <div className='flex flex-col w-full h-2/3 items-center justify-center'>
          <h3 className="text-[14px] xl:text-[16px] font-semibold">{name}</h3>
          <p className="text-[12px] xl:text-[14px] text-gray-500 font-normal">
            {title}, {department}
          </p>
          {desc && (
            <p className="mt-2 text-[14px] xl:text-[16px] text-center text-gray-700">
              {desc}
            </p>
          )}
          {specialties && specialties.length > 0 && (
            <ul className="mt-2 text-sm  list-disc pl-5">
              {specialties.map((specialty, index) => (
                <li key={index} className="hover:text-underline text-blue-600">
                  {specialty}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Link>
  );
};