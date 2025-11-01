// Layout: Side-by-side (compact, horizontal)

"use client";

import Image from "next/image";
import Link from "next/link";
import { BannerData, BannerItemProps } from "../types";
import { Button } from "@/components/UI";
import { normalizeBannerData } from "../utils";

export default function Banner3({
  data,
  className = "",
}: BannerItemProps) {
  const banners = normalizeBannerData(data);

  if (banners.length === 0) return null;

  // For multiple items, render as a grid/list
  if (banners.length > 1) {
    return (
      <div
        className={`grid  grid-cols-1 
          sm:grid-cols-2 
          lg:grid-cols-3 
           gap-4 ${className}`}
      >
        {banners.map((banner) => (
          <SingleBanner3Item key={banner.id} banner={banner} />
        ))}
      </div>
    );
  }

  // For single item, render normal layout
  return <SingleBanner3Item banner={banners[0]} />;
}

function SingleBanner3Item({ banner }: { banner: BannerData }) {
  const { title, description, image, cta, badge } = banner;

  return (
    <div
      className={`
      flex flex-col md:flex-row items-center md:items-start
      gap-4 sm:gap-5 md:gap-6
      p-4 sm:p-5 md:p-6 
      bg-white border border-gray-200
      rounded-xl shadow-sm hover:shadow-md transition-shadow
    `}
    >
      {/* Compact Image */}
      {image && (
        <div
          className="
        relative 
        w-full sm:w-40 md:w-32 
        h-36 sm:h-40 md:h-32 
        flex-shrink-0
      "
        >
          <Image
            src={image}
            alt={title || "Banner"}
            fill
            sizes="(max-width: 768px) 100vw, 200px"
            className="object-cover rounded-lg"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 space-y-2 sm:space-y-3 text-center md:text-left">
        {badge && (
          <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-semibold rounded">
            {badge}
          </span>
        )}

        {title && (
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-snug">
            {title}
          </h3>
        )}

        {description && (
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* CTA Button */}
      {cta && (
        <div className="w-full md:w-auto flex justify-center md:justify-end mt-3 md:mt-0">
          <Link href={cta.href}>
            <Button label={cta.text} variant="primary" base="on" />
          </Link>
        </div>
      )}
    </div>
  );
}