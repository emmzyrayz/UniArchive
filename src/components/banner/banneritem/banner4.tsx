// Layout: Full-width hero with overlay

"use client";

import Image from "next/image";
import Link from "next/link";
import { BannerItemProps } from "../types";
import { Button } from "@/components/UI";
import { normalizeBannerData, useAutoRotate } from "../utils";

export default function Banner4({
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
        className={`relative w-full h-96 md:h-[500px] rounded-2xl overflow-hidden`}
      >
        {/* Background Image */}
        {image && (
          <Image
            src={image}
            alt={title || "Banner"}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50 bg-opacity-40" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-6 md:p-12">
          {badge && (
            <span className="inline-block px-4 py-1 bg-white/60 text-black bg-opacity-20 backdrop-blur-sm text-sm font-semibold rounded-full mb-4">
              {badge}
            </span>
          )}

          {title && (
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {title}
            </h2>
          )}

          {description && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
              {description}
            </p>
          )}

          {cta && (
            <Link href={cta.href}>
              <Button label={cta.text} variant="primary" base="on" />
            </Link>
          )}
        </div>

        {/* Navigation Arrows (Only show if multiple) */}
        {isMultiple && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 hover:bg-white cursor-pointer hover:scale-110 bg-opacity-30 hover:bg-opacity-50 transition-all"
              aria-label="Previous banner"
            >
              <svg
                className="w-6 h-6 text-black/50 hover:text-black"
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

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 hover:bg-white cursor-pointer hover:scale-110 bg-opacity-30 hover:bg-opacity-50 transition-all"
              aria-label="Next banner"
            >
              <svg
                className="w-6 h-6 text-black/50 hover:text-black"
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
          </>
        )}
      </div>

      {/* Bottom Navigation Dots (Only show if multiple) */}
      {isMultiple && (
        <div className="flex justify-center gap-2">
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
      )}
    </div>
  );
}
