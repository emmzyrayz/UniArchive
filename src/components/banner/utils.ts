import { BannerData } from "./types";
import { useEffect, useState } from "react";

export const normalizeBannerData = (
  data: BannerData | BannerData[] | undefined
): BannerData[] => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

// Custom hook for auto-rotation
export const useAutoRotate = (
  totalItems: number,
  autoRotate: boolean = true,
  interval: number = 5000,
) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoRotate || totalItems <= 1) return;

      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalItems);
      }, interval);

    return () => clearInterval(timer);
  }, [autoRotate, totalItems, interval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < totalItems) {
      setCurrentIndex(index);
    }
  };

  return { currentIndex, goToPrevious, goToNext, goToIndex };
};