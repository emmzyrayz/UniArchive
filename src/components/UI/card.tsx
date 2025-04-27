'use client';

// src/components/ui/card.tsx
import React from "react";
import Image, {StaticImageData} from "next/image";
import {motion, MotionProps} from "framer-motion";

interface BaseCardProps {
  title: string;
  description?: string;
  className?: string;
  imageUrl?: string | StaticImageData;
  motionProps?: MotionProps;
  layout?: "top" | "left"; // for CardOne only
}

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
        layout === "left" ? "flex-row justify-between" : "flex-col"
      } bg-white rounded-xl shadow-md hover:shadow-lg overflow-hidden min-w-[250px] xl:min-w-[300px] min-h-[100px] xl:min-h-[130px] border-gray-300 border-[2px] cursor-pointer ${className}`}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          width={layout === "left" ? 100 : 400}
          height={layout === "left" ? 100 : 500}
          className={`object-fit ${
            layout === "left" ? "min-w-[40%] h-full" : "w-full min-h-full"
          } `}
        />
      )}

      <div className="p-4 min-w-[60%] h-full flex flex-col items-center justify-center">
        <h3 className="text-[14px] xl:text-[16px] font-bold">{title}</h3>
        {description && (
          <p className="text-[12px] xl:text-[14px] text-gray-600 mt-2">{description}</p>
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
      className={`relative min-w-[400px] xl:min-w-[520px] min-h-[250px] xl:min-h-[300px] border-gray-300 border-[2px] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl cursor-pointer ${className}`}
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
      className={`flex flex-col items-center justify-center w-[300px] xl:w-[350px] h-[150px] xl:h-[200px] border-gray-300 border-[2px] bg-white p-6 rounded-xl shadow-md ${className}`}
    >
      <h3 className="text-[16px] xl:text-[18px] font-bold">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      )}
    </motion.div>
  );
};

