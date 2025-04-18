"use client";
import React, {useEffect, useRef, useState} from "react";
import {motion, AnimatePresence} from "framer-motion";
import { MediaRenderer } from "@/utils/mediarender";
import "./bannner.css";
import { IoAlertCircle } from "react-icons/io5";
import {StaticImageData} from "next/image";

// Images
import Lego from '@/assets/img/gallery/lego.jpg';
import Leica from '@/assets/img/gallery/leica.jpg';
import Nashville from '@/assets/img/gallery/nashville.jpg';
import surf from '@/assets/img/gallery/surf.jpg';
import Post from '@/assets/img/post/post_5.png';
import Blog from '@/assets/img/people/gallery/g5.jpg';
import Post1 from '@/assets/img/post/post_9.png';
import RedBull from '@/assets/img/gallery/red-bull.jpg';

// avatars
import Ava1 from '@/assets/img/people/avatar/comment_1.png';
import Ava2 from '@/assets/img/people/avatar/comment_2.png';
import Ava3 from '@/assets/img/people/avatar/comment_3.png';
import Ava4 from '@/assets/img/people/avatar/author.png';


// Add type guard functions
function isStaticImageData(image: string | StaticImageData | null): image is StaticImageData {
  return image !== null && typeof image !== 'string' && 'src' in image;
}

function isString(image: string | StaticImageData | null): image is string {
  return typeof image === 'string';
}

// Add type safety for banner data
interface BannerItem {
  title: string;
  description: string;
  btnUrl: string;
  btnText: string;
  image: string | StaticImageData  | null;
}

// Define the shape of the card data
interface CardData {
  id: number;
  title: string;
  description?: string; // Optional field for additional data
  imageUrl?: string | StaticImageData; // Optional field for an image
  difficulty?: string;
  wishlist?: boolean;
  tutorname?: string;
  tutorimg?: string | StaticImageData;
  students?: number;
  rating?: number;
}

interface DemoCardProps {
  title: string;
  description?: string;
  imageUrl?: string | StaticImageData;
  isHoverable: boolean;
  cardData: CardData; // Single card data
  cardIndex: number; // Add this to track the card's index
  setCurrentIndex: (index: number) => void;
}

const bannerData: BannerItem[] = [
  {
    title: "Online Learning Platform",
    description:
      "Build your skills with courses, certificates, and degrees online from world-class universities and companies.",
    btnUrl: "/signup",
    btnText: "Join For Free",
    image: Lego, // Replace with your image path
  },
  {
    title: "Learn at Your Own Pace",
    description:
      "Access courses anytime, anywhere, and learn at your own pace with flexible schedules.",
    btnUrl: "/courses",
    btnText: "Explore Courses",
    image: Post, // Replace with your GIF path
  },
  {
    title: "Expert-Led Courses",
    description:
      "Learn from industry experts and gain practical skills to advance your career.",
    btnUrl: "/instructors",
    btnText: "Meet Our Instructors",
    image: Blog, // No image for this slide
  },
  {
    title: "Certifications That Matter",
    description:
      "Earn recognized certifications to boost your resume and career prospects.",
    btnUrl: "/certifications",
    btnText: "View Certifications",
    image: RedBull, // Replace with your image path
  },
  {
    title: "Join a Global Community",
    description:
      "Connect with learners from around the world and grow your professional network.",
    btnUrl: "/community",
    btnText: "Join the Community",
    image: Post1, // Replace with your GIF path
  },
];

// Example card data array
const cardData: CardData[] = [
  {
    id: 1,
    title: "Card 1",
    description: "Description for Card 1",
    imageUrl: Lego,
    difficulty: 'intermediate',
    wishlist: false,
    tutorname: 'Alonzo Murray',
    tutorimg: Lego,
    students: 57,
    rating: 3.5,
  },
  {
    id: 2,
    title: "Card 2",
    description: "Description for Card 2",
    imageUrl: Leica,
  },
  {
    id: 3,
    title: "Card 3",
    description: "Description for Card 3",
    imageUrl: Nashville,
  },
  {
    id: 4,
    title: "Card 4",
    description: "Description for Card 4",
    imageUrl: surf,
  },
  {
    id: 5,
    title: "Card 5",
    description: "Description for Card 5",
    imageUrl: RedBull,
  },
  {
    id: 6,
    title: "Card 6",
    description: "Description for Card 6",
    imageUrl: Nashville,
  },
  {
    id: 7,
    title: "Card 7",
    description: "Description for Card 7",
    imageUrl: Lego,
  },
  {
    id: 8,
    title: "Card 8",
    description: "Description for Card 8",
    imageUrl: Leica,
  },
  {
    id: 9,
    title: "Card 9",
    description: "Description for Card 9",
    imageUrl: surf,
  },
  {
    id: 10,
    title: "Card 10",
    description: "Description for Card 10",
    imageUrl: RedBull,
  },
];

// 1. Slide Timing Configuration
const SLIDE_DISPLAY_TIME = 7800; // Total time each slide stays (7.8 seconds)
// const FADE_TRANSITION_TIME = 1000; // Fade transition duration (1 second)
// const TRANSITION_DELAY = 500; // Delay before next slide (0.5 seconds)

// 1. Basic Animation Parameters
// const ANIMATION_CONFIG = {
//   radius: 250, // Circle radius for card positioning
//   duration: 0.8, // Animation duration
//   scaleRange: { min: 0.6, max: 1.0 }, // Card scaling limits
//   opacityRange: { min: 0.4, max: 1.0 }, // Card opacity limits
// };


export const Banner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % bannerData.length);
    }, SLIDE_DISPLAY_TIME); // Modify this value to change slide duration

    return () => clearInterval(interval);
  }, []);

  const handleImageError = (imagePath: string) => {
    setFailedImages((prev) => new Set(prev).add(imagePath));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Helper function to get image source and handle error tracking
  const getImageSource = (image: string | StaticImageData | null) => {
    if (isStaticImageData(image)) {
      return image.src;
    }
    if (isString(image)) {
      return image;
    }
    return null;
  };

  // Helper function to check if an image should be displayed
  const shouldDisplayImage = (image: string | StaticImageData | null) => {
    if (!image) return false;
    const src = getImageSource(image);
    return src && !failedImages.has(src);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start mb-[240px] lg:mb-[140px]">
      <div className="banner-section h-[50vh] lg:h-[70vh] w-full relative overflow-hidden">
        {bannerData.map((slide, index) => (
          <div
            key={index}
            className={`banner-item absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-tr from-white/40 to-black/60 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transition: "opacity 1s ease-in-out",
              transitionDelay: index === currentSlide ? "0s" : "0.5s",
            }}
          >
            {/* Background Image/GIF (Large Screens Only) */}
            {shouldDisplayImage(slide.image) && (
              <div className="hidden lg:block absolute inset-0 z-0">
                <img
                  src={getImageSource(slide.image) || ""}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                  onError={() => {
                    const src = getImageSource(slide.image);
                    if (src) handleImageError(src);
                  }}
                />
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 to-white/10 z-10"></div>

            {/* Content */}
            <div className="relative z-20 text-white max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {slide.title}
              </h1>
              <p className="text-lg md:text-xl mb-6">{slide.description}</p>
              <a
                href={slide.btnUrl}
                className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-black hover:text-white transition-colors"
              >
                {slide.btnText}
              </a>
            </div>
          </div>
        ))}

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {bannerData.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors hover:bg-white/40 ${
                index === currentSlide ? "bg-white" : "bg-black/60"
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Stacked Card Carousel */}
      <div className="relative mt-16 lg:mt-[50px] w-full  h-[30vh] z-40">
        <DemoCardCarousel />
      </div>
    </div>
  );
};

export const MBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % bannerData.length);
    }, SLIDE_DISPLAY_TIME); // Modify this value to change slide duration

    return () => clearInterval(interval);
  }, []);

  const handleImageError = (imagePath: string) => {
    setFailedImages((prev) => new Set(prev).add(imagePath));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Helper function to get image source and handle error tracking
  const getImageSource = (image: string | StaticImageData | null) => {
    if (isStaticImageData(image)) {
      return image.src;
    }
    if (isString(image)) {
      return image;
    }
    return null;
  };

  // Helper function to check if an image should be displayed
  const shouldDisplayImage = (image: string | StaticImageData | null) => {
    if (!image) return false;
    const src = getImageSource(image);
    return src && !failedImages.has(src);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start p-[12px] rounded-xl">
      <div className="banner-section h-[50vh] lg:h-[70vh] w-full relative overflow-hidden rounded-2xl">
        {bannerData.map((slide, index) => (
          <div
            key={index}
            className={`banner-item absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-tr from-white/40 to-black/60 rounded-2xl ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transition: "opacity 1s ease-in-out",
              transitionDelay: index === currentSlide ? "0s" : "0.5s",
            }}
          >
            {/* Background Image/GIF (Large Screens Only) */}
            {shouldDisplayImage(slide.image) && (
              <div className="hidden lg:block absolute inset-0 z-0 rounded-xl">
                <img
                  src={getImageSource(slide.image) || ""}
                  alt={slide.title}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => {
                    const src = getImageSource(slide.image);
                    if (src) handleImageError(src);
                  }}
                />
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 to-white/10 z-10"></div>

            {/* Content */}
            <div className="relative z-20 text-white max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {slide.title}
              </h1>
              <p className="text-lg md:text-xl mb-6">{slide.description}</p>
              <a
                href={slide.btnUrl}
                className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-black hover:text-white transition-colors"
              >
                {slide.btnText}
              </a>
            </div>
          </div>
        ))}

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {bannerData.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors hover:bg-white/40 ${
                index === currentSlide ? "bg-white" : "bg-black/60"
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const DemoCardCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start the animation
  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    setWindowWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % cardData.length);
      }, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered]);

  // Utility function to map a value from one range to another
  const mapRange = (
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  const calculateCardPosition = (index: number) => {
    const totalCards = cardData.length;
    // Adjust radius based on screen size
    const baseRadius = windowWidth >= 1024 ? 700 : 600;
    const angleStep = (2 * Math.PI) / totalCards;
    const currentAngle = (index - currentIndex) * angleStep;

    // Adjust visible cards based on screen size
    const visibleRange = windowWidth >= 1024 ? 2 : 1; // Show 5 cards (2 on each side) on large screens, 3 cards on smaller screens
    const distanceFromCenter = Math.abs(
      ((index - currentIndex + totalCards) % totalCards) - totalCards / 2
    );

    const x = 
      windowWidth >= 1024
        ? (Math.sin(currentAngle) * baseRadius) / 1.2 
        : (Math.sin(currentAngle) * baseRadius) / 1.6;
    const z =
      windowWidth >= 1024
        ? (Math.cos(currentAngle) * baseRadius) / 1.5
        : (Math.cos(currentAngle) * baseRadius) / 1.5;

    const isVisible = visibleRange <= distanceFromCenter;

    let scale = 0.6;
    let opacity = 0.4;

    if (isVisible) {
      // Adjust scale and opacity based on distance from center
      const normalizedDistance =
        windowWidth >= 1024
          ? 1 - (visibleRange + 1) / distanceFromCenter / 1.2
          : 1 - (visibleRange + 1.2) / distanceFromCenter;
      scale = 0.6 + normalizedDistance * 0.6; // Scale range: 0.6 to 1.0
      opacity = 0.4 + normalizedDistance * 0.6; // Opacity range: 0.4 to 1.0
    }

    return {
      x,
      z,
      scale: isVisible ? scale : 0,
      opacity: isVisible ? opacity : 0,
      rotateY: (currentAngle * 180) / Math.PI,
      isVisible,
    };
  };

  return (
    <div
      className="w-full h-[300px] flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative w-full max-w-6xl h-full flex items-center justify-center"
        style={{
          perspective: "1300px",
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <AnimatePresence mode="popLayout">
            {cardData.map((card, index) => {
              const position = calculateCardPosition(index);

              return (
                <motion.div
                  key={card.id}
                  className="absolute"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center center",
                    left: "50%",
                    top: "50%",
                    pointerEvents: position.isVisible ? "auto" : "none",
                  }}
                  initial={false}
                  animate={{
                    transformStyle: "preserve-3d", // Explicitly set on client and server
                    transformOrigin: "center center",
                    x: `calc(${position.x}px - 50%)`,
                    y: "-50%",
                    z: position.z,
                    scale: position.scale,
                    opacity: position.opacity,
                    rotateY: position.rotateY,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeInOut",
                    type: "spring", // Add spring animation
                    stiffness: 100, // Adjust spring stiffness
                    damping: 15, // Adjust spring damping
                  }}
                >
                  <DemoCard
                    title={card.title}
                    description={card.description}
                    imageUrl={card.imageUrl}
                    isHoverable={position.isVisible}
                    cardData={card}
                    cardIndex={index} // Pass the index
                    setCurrentIndex={setCurrentIndex}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Update your DemoCard component to include 3D transforms
const DemoCard = ({
  title,
  description,
  imageUrl,
  isHoverable,
  cardData,
  cardIndex, // Add this parameter
  setCurrentIndex,
}: DemoCardProps) => {
  const handleCardClick = () => {
    if (isHoverable) {
      setCurrentIndex(cardIndex);
      console.log(`Card ${cardData.id} clicked`);
    }
  };

  // Helper function to get the correct image source
  const getImageSource = (img?: string | StaticImageData) => {
    if (!img) return undefined;
    return isStaticImageData(img) ? img.src : img;
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={`
        w-[150px] h-[200px] 
        md:w-[180px] md:h-[240px] 
        lg:w-[220px] lg:h-[280px] 
        bg-white rounded-lg shadow-xl flex flex-col overflow-hidden
        ${
          isHoverable
            ? "cursor-pointer hover:shadow-2xl transition-shadow duration-300"
            : ""
        }
      `}
      style={{
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
      }}
      whileHover={isHoverable ? {scale: 1.05} : {}}
      transition={{duration: 0.2}}
    >
      {imageUrl && (
        <div className="flex items-center justify-center w-full h-1/2 overflow-hidden bg-red-500">
          <MediaRenderer
            sources={[
              {
                type: "image",
                url: getImageSource(imageUrl) || "",
                alt: "Main image",
              },
            ]}
            fallbackIcon={IoAlertCircle}
            returnNull={false}
            width={300}
            height={500}
            className="w-full h-full object-contain"
          />
        </div>
      )}
      <div className="p-2 h-1/2 flex-1 flex flex-col items-center justify-center">
        <h3 className="text-base md:text-lg lg:text-xl font-medium truncate">
          {title}
        </h3>
        {description && (
          <p className="text-xs md:text-sm lg:text-base font-thin text-gray-600">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
