// Layout: Text only (minimal design)

"use client";

import Link from "next/link";
import { BannerItemProps } from "../types";
import { Button } from "@/components/UI";
import { normalizeBannerData, useAutoRotate } from "../utils";


export default function Banner2({
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
  const { title, description, cta, badge, icon } = currentBanner;
  const isMultiple = banners.length > 1;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Banner - No internal animation, just layout */}
      <div
        className={`
          p-8 md:p-12 lg:p-16
          bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700
          rounded-2xl text-white
          text-center space-y-6
        `}
      >
        {/* Icon/Badge */}
        {icon && (
          <div className="flex justify-center text-4xl md:text-5xl">{icon}</div>
        )}

        {badge && (
          <span className="inline-block px-4 py-1 bg-white bg-opacity-20 backdrop-blur-sm text-sm font-semibold rounded-full">
            {badge}
          </span>
        )}

        {/* Content */}
        {title && <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>}

        {description && (
          <p className="text-white text-opacity-90 text-lg max-w-2xl mx-auto">
            {description}
          </p>
        )}

        {/* CTA */}
        {cta && (
          <div className="pt-4">
            <Link href={cta.href}>
              <Button
                label={cta.text}
                variant="outline"
                base="on"
                className="border-white text-white hover:bg-white hover:text-indigo-600"
              />
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Controls (Only show if multiple banners) */}
      {isMultiple && (
        <div className="flex items-center justify-center gap-4">
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
