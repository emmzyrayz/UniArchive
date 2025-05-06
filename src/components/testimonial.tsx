"use client";

import React, {useEffect, useRef} from "react";
import Image, {StaticImageData} from "next/image";
import Link from "next/link";

// Images
// import Lego from "@/assets/img/gallery/lego.jpg";
// import Leica from "@/assets/img/gallery/leica.jpg";
// import Nashville from "@/assets/img/gallery/nashville.jpg";
// import surf from "@/assets/img/gallery/surf.jpg";
// import Post from "@/assets/img/post/post_5.png";
// import Blog from "@/assets/img/people/gallery/g5.jpg";
// import Post1 from "@/assets/img/post/post_9.png";
// import RedBull from "@/assets/img/gallery/red-bull.jpg";

// avatars
import Ava1 from "@/assets/img/people/avatar/comment_1.png";
import Ava2 from "@/assets/img/people/avatar/comment_2.png";
import Ava3 from "@/assets/img/people/avatar/comment_3.png";
import Ava4 from "@/assets/img/people/avatar/author.png";

// Define types for the testimonial component
export interface TestimonialProps {
  name: string;
  content: string;
  avatar: StaticImageData;
  role?: string;
  institution?: string;
  institutionLink?: string;
  rating?: number;
  highlight?: boolean;
}

export const Testimonial: React.FC<TestimonialProps> = ({
  name,
  content,
  avatar,
  role = "Student",
  institution = "",
  institutionLink = "#",
  rating = 5,
}) => {
  // Helper function to handle different avatar types
  // const renderAvatar = () => {
  //   return (
  //     <Image
  //       src={avatar}
  //       alt={`Avatar of ${name}`}
  //       className="rounded-full object-cover"
  //       width={80}
  //       height={80}
  //     />
  //   );
  // };

  // Render star ratings
  const renderStars = () => {
    return (
      <div className="flex items-center mt-2 mb-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "text-yellow-500" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        ))}
      </div>
    );
  };

  // Default horizontal layout
  return (
    <div className="flex-col xl:flex-row  bg-white rounded-lg shadow-md h-full xl:h-[220px] w-[230px] xl:min-w-[230px] flex overflow-hidden transition-all duration-500 transform hover:xl:min-w-[650px] group cursor-pointer hover:shadow-xl">
      {/* Left side - Always visible */}
      <div className="w-[230px] p-2 xl:p-6 flex flex-col items-center justify-center border-r border-gray-100">
        <div className="avatar w-20 h-20 mb-3">
          <Image
            src={avatar}
            alt={`Avatar of ${name}`}
            className="rounded-full object-cover"
            width={80}
            height={80}
          />
        </div>

        {renderStars()}

        <Link
          href="#"
          className="font-semibold text-center text-gray-800 hover:text-blue-600"
        >
          {name}
        </Link>

        <p className="text-sm text-center text-gray-500">
          {role}{" "}
          {institution && (
            <>
              at{" "}
              <Link
                href={institutionLink}
                className="text-blue-600 hover:underline"
              >
                {institution}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Right side - Revealed on hover */}
      <div className="w-full h-full xl:w-0 group-hover:xl:w-[420px] p-0 group-hover:xl:p-6 flex xl:hidden group-hover:xl:flex transition-all duration-500 items-center overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          <div className="quote flex w-full items-center justify-start pl-6">
            <svg
              className="w-8 h-8 text-blue-400 opacity-20"
              fill="currentColor"
              viewBox="0 0 32 32"
            >
              <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm12 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z"></path>
            </svg>
          </div>
          <span className="flex p-2 text-gray-700 text-sm pl-3 pt-2 xl:pt-6 w-full h-full break-words whitespace-normal line-clamp-5 overflow-y-auto max-h-48 text-center">
            {content}
          </span>
          <div className="quote flex w-full items-center justify-start pl-6 -pt-2 rotate-180">
            <svg
              className="w-8 h-8 text-blue-400 opacity-20"
              fill="currentColor"
              viewBox="0 0 32 32"
            >
              <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm12 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Testimonial Carousel component
export interface TestimonialCarouselProps {
  testimonials: TestimonialProps[];
  speed?: number; // Animation speed in pixels per second
}

export const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({
  testimonials,
  speed = 30, // Default speed
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current || !containerRef.current) return;

    // Clone testimonials for seamless infinite scrolling
    const scrollContainer = scrollRef.current;
    const container = containerRef.current;
    const scrollWidth = scrollContainer.scrollWidth;
    const containerWidth = container.clientWidth;

    // Only start animation if content exceeds container width
    if (scrollWidth <= containerWidth) return;

    // Calculate animation duration based on content width and speed
    const pixelsPerSecond = speed;
    const durationInSeconds = scrollWidth / pixelsPerSecond;
    const durationInMs = durationInSeconds * 1000;

    // Setup animation
    scrollContainer.style.animationDuration = `${durationInMs}ms`;
    scrollContainer.classList.add("animate-scroll");

    // Pause animation on hover
    container.addEventListener("mouseenter", () => {
      scrollContainer.style.animationPlayState = "paused";
    });

    container.addEventListener("mouseleave", () => {
      scrollContainer.style.animationPlayState = "running";
    });

    return () => {
      container.removeEventListener("mouseenter", () => {});
      container.removeEventListener("mouseleave", () => {});
    };
  }, [testimonials, speed]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden bg-gray-50 py-8">
      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
      `}</style>

      <div ref={scrollRef} className="flex flex-col lg:flex-row lg:gap-1 gap-3 whitespace-nowrap">
        {/* Original testimonials */}
        {testimonials.map((testimonial, index) => (
          <div key={`original-${index}`} className="inline-block mx-4">
            <Testimonial {...testimonial} />
          </div>
        ))}

        {/* Cloned testimonials for seamless scrolling */}
        {testimonials.map((testimonial, index) => (
          <div key={`clone-${index}`} className="inline-block mx-4">
            <Testimonial {...testimonial} />
          </div>
        ))}
      </div>
    </div>
  );
};

// export const TestimonialsPage: React.FC = () => {
//   // Create testimonial data array
//   const testimonials = [
//     {
//       name: "John Doe",
//       content:
//         "I learned so much from the educational website. It helped me excel in my studies and achieve my academic goals.",
//       avatar: Ava1, // Use your imported avatar directly
//       role: "Student",
//       institution: "UNILAG",
//       institutionLink: "#",
//       rating: 5,
//       highlight: true,
//     },
//     {
//       name: "Jane Smith",
//       content:
//         "The educational website provided me with valuable resources that enhanced my learning experience.",
//       avatar: Ava2, // Use your imported avatar directly
//       role: "Professor",
//       institution: "Harvard",
//       rating: 4,
//     },
//     {
//       name: "Alex Johnson",
//       content:
//         "The interactive learning modules made difficult subjects approachable and fun.",
//       avatar: Ava3, // Use your imported avatar directly
//       role: "High School Student",
//       rating: 5,
//     },
//   ];

//   return (
//     <div className="container mx-auto px-4 py-12">
//       <h1 className="text-3xl font-bold text-center mb-12">Testimonials</h1>

//       {/* Basic Horizontal Layout */}
//       <div className="mb-16">
//         <h2 className="text-2xl font-semibold mb-6">Featured Testimonial</h2>
//         <Testimonial
//           name={testimonials[0].name}
//           content={testimonials[0].content}
//           avatar={testimonials[0].avatar}
//           role={testimonials[0].role}
//           institution={testimonials[0].institution}
//           rating={testimonials[0].rating}
//           highlight={testimonials[0].highlight}
//         />
//       </div>

//       {/* Grid Layout */}
//       <div className="mb-16">
//         <h2 className="text-2xl font-semibold mb-6">More Success Stories</h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {testimonials.map((testimonial, index) => (
//             <Testimonial
//               key={index}
//               name={testimonial.name}
//               content={testimonial.content}
//               avatar={testimonial.avatar}
//               role={testimonial.role}
//               institution={testimonial.institution}
//               rating={testimonial.rating}
//               layout="vertical"
//             />
//           ))}
//         </div>
//       </div>

//       {/* Optional: Carousel Layout */}
//       <div>
//         <h2 className="text-2xl font-semibold mb-6">Testimonial Showcase</h2>
//         <TestimonialCarousel
//           testimonials={testimonials}
//           autoplay={true}
//           interval={5000}
//           showArrows={true}
//           showDots={true}
//         />
//       </div>
//     </div>
//   );
// };

// Example usage component with multiple testimonials
export const TestimonialsSection: React.FC = () => {
  // This would typically come from your data source
  const testimonials = [
    {
      name: "John Doe",
      content:
        "The educational resources provided were exceptional and helped me understand complex concepts with ease. I highly recommend this platform to all students.",
      avatar: Ava1,
      role: "Graduate Student",
      institution: "MIT",
      institutionLink: "#",
      rating: 5,
      highlight: true,
    },
    {
      name: "Jane Smith",
      content:
        "As an educator, I find these materials to be well-structured and engaging. My students have shown remarkable improvement since I started using this platform.",
      avatar: Ava2,
      role: "Professor",
      institution: "Harvard",
      rating: 4,
    },
    {
      name: "Alex Johnson",
      content:
        "The interactive learning modules made difficult subjects approachable and fun. The customer support team was also incredibly helpful whenever I had questions.",
      avatar: Ava3,
      role: "High School Student",
      rating: 5,
    },
    {
      name: "Sarah Williams",
      content:
        "This platform transformed how I study. The personalized learning paths helped me focus on areas where I needed improvement.",
      avatar: Ava4,
      role: "Undergraduate",
      institution: "Stanford",
      rating: 5,
    },
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            What Our Users Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don&apos;t just take our word for it. See what students and educators
            have to say about their experience.
          </p>
        </div>

        <TestimonialCarousel testimonials={testimonials} speed={40} />
      </div>
    </section>
  );
};
