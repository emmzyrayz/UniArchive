"use client";

import { ReactNode, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BannerData } from "../types";
import { normalizeBannerData } from "../utils";

interface BannerCarouselProps {
  data: (BannerData | BannerData[])[];
  children: (bannerData: BannerData) => ReactNode;
  autoRotate?: boolean;
  autoRotateInterval?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export default function BannerCarousel({
  data,
  children,
  autoRotate = true,
  autoRotateInterval = 5000,
  duration = 0.6,
  delay = 0,
  className = "",
}: BannerCarouselProps) {
  // Flatten all data arrays into single array
  const allBanners: BannerData[] = data.flatMap((item) =>
    normalizeBannerData(item)
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotation logic
  useEffect(() => {
    if (!autoRotate || allBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allBanners.length);
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [autoRotate, allBanners.length, autoRotateInterval]);

  if (allBanners.length === 0) return null;

  const currentBanner = allBanners[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allBanners.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allBanners.length - 1 ? 0 : prev + 1));
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < allBanners.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration, delay, type: "spring", stiffness: 100 }}
      className={className}
      viewport={{ once: true, amount: 0.5 }}
    >
      {/* Banner Container */}
      <div className="space-y-4">
        {/* Render current banner using children function */}
        <div key={currentIndex}>{children(currentBanner)}</div>

        {/* Navigation Controls */}
        {allBanners.length > 1 && (
          <div className="flex items-center justify-between px-4">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous banner"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex gap-2">
              {allBanners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-indigo-600 w-8"
                      : "bg-gray-300 hover:bg-gray-400 w-2"
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next banner"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
