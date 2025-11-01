// Layout: Large image left, content right

"use client";

import Image from "next/image";
import Link from "next/link";
import { BannerItemProps } from "../types";
import { normalizeBannerData, useAutoRotate } from "../utils";
import { Button } from "@/components/UI";
// import { motion, AnimatePresence } from "framer-motion";
// import { useState } from "react";

export default function Banner1({
  data,
  className = "",
  autoRotate = true,
  autoRotateInterval = 5000,
}: BannerItemProps) {
  const banners = normalizeBannerData(data);
  const { currentIndex, goToPrevious, goToNext, goToIndex } = useAutoRotate(
    banners.length,
    autoRotate && banners.length > 1,
    autoRotateInterval
  );

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const { title, description, image, cta, badge } = currentBanner;
  const isMultiple = banners.length > 1;

  

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Banner - No internal animation, just layout */}
      <div
        className={`
          grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12
          items-center p-6 md:p-10 lg:p-16
          bg-gradient-to-r from-indigo-50 to-blue-50
          rounded-2xl overflow-hidden relative
        `}
      >
        {/* Image Section */}
        {image && (
          <div className="relative h-64 md:h-80 lg:h-96 order-2 md:order-1">
            <Image
              src={image}
              alt={title || "Banner"}
              fill
              className="object-cover rounded-xl"
              priority
            />
          </div>
        )}

        {/* Content Section */}
        <div className={`space-y-4 ${image ? "order-1 md:order-2" : ""}`}>
          {badge && (
            <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
              {badge}
            </span>
          )}

          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {title}
            </h2>
          )}

          {description && (
            <p className="text-gray-600 text-lg leading-relaxed">
              {description}
            </p>
          )}

          {cta && (
            <div className="pt-4">
              <Link href={cta.href}>
                <Button
                  label={cta.text}
                  variant={cta.variant || "primary"}
                  base="on"
                />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls (Only show if multiple banners) */}
      {isMultiple && (
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
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-indigo-600 w-8"
                    : "bg-gray-300 hover:bg-gray-400"
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
  );
}
