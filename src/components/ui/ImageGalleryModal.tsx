// components/ImageGalleryModal.tsx
'use client'

import {useEffect, useState} from "react";
import {useSwipeable} from "react-swipeable";
import Image from "next/image";

export const ImageGalleryModal = ({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handlers = useSwipeable({
    onSwipedLeft: () =>
      setActiveIndex((prev) => Math.min(prev + 1, images.length - 1)),
    onSwipedRight: () => setActiveIndex((prev) => Math.max(prev - 1, 0)),
    trackMouse: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      if (e.key === "ArrowRight")
        setActiveIndex((prev) => Math.min(prev + 1, images.length - 1));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
      >
        &times;
      </button>

      <div className="max-w-4xl w-full h-full flex items-center">
        <div {...handlers} className="relative w-full h-3/4 overflow-hidden">
          {images.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={img}
                alt={`Blog visual ${index + 1}`}
                className="w-full h-full object-contain"
                width={300}
                height={500}
                
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === activeIndex ? "bg-white" : "bg-gray-500"
            }`}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};