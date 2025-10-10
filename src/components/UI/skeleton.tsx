import { CSSProperties } from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "avatar" | "card" | "image";
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
  animation?: "pulse" | "wave" | "none";
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  color?: "light" | "dark" | "auto";
}

export default function Skeleton({
  variant = "text",
  width,
  height,
  count = 1,
  className = "",
  animation = "pulse",
  rounded = "md",
  color = "auto",
}: SkeletonProps) {
  const getVariantStyles = () => {
    const baseStyles = {
      text: { width: width || "100%", height: height || "1rem" },
      circular: { width: width || "3rem", height: height || "3rem" },
      rectangular: { width: width || "100%", height: height || "8rem" },
      avatar: { width: width || "2.5rem", height: height || "2.5rem" },
      card: { width: width || "18rem", height: height || "12rem" },
      image: { width: width || "100%", height: height || "12rem" },
    }[variant];

    return baseStyles;
  };

  const getRoundedClass = () => {
    const roundedMap = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    }[rounded];

    // Override for specific variants
    if (variant === "circular") return "rounded-full";
    if (variant === "text") return "rounded";
    return roundedMap;
  };

  const getColorClass = () => {
    const colorMap = {
      light: "bg-gray-200",
      dark: "bg-gray-700",
      auto: "bg-gray-200 dark:bg-gray-700",
    }[color];

    return colorMap;
  };

  const getAnimationClass = () => {
    if (animation === "none") return "";

    return animation === "pulse"
      ? "animate-pulse"
      : "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[wave_2s_linear_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent dark:before:via-gray-900/20";
  };

  const baseClasses = `
    ${getColorClass()}
    ${getAnimationClass()}
    ${getRoundedClass()}
    ${className}
  `
    .replace(/\s+/g, " ")
    .trim();

  const variantStyles = getVariantStyles();
  const style: CSSProperties = {
    width: variantStyles.width,
    height: variantStyles.height,
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={baseClasses}
          style={style}
          aria-label="Loading..."
          role="status"
        />
      ))}
    </>
  );
}


// Usage Example

// import Skeleton from "./skeleton";
// import {
//   FiUser,
//   FiBook,
//   FiMessageSquare,
//   FiAward,
//   FiVideo,
// } from "react-icons/fi";

// export default function SkeletonExamples() {
//   return (
//     <div className="p-6 space-y-8 bg-white dark:bg-gray-900">
//       {/* Course Card Skeletons */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Course Cards
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[1, 2, 3].map((i) => (
//             <div
//               key={i}
//               className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
//             >
//               <Skeleton variant="image" animation="wave" className="mb-4" />
//               <Skeleton
//                 variant="text"
//                 width="80%"
//                 animation="wave"
//                 className="mb-2"
//               />
//               <Skeleton
//                 variant="text"
//                 width="60%"
//                 animation="wave"
//                 className="mb-4"
//               />
//               <div className="flex justify-between items-center">
//                 <Skeleton variant="text" width="4rem" animation="wave" />
//                 <Skeleton variant="text" width="6rem" animation="wave" />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* User Profile Loading */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           User Profile
//         </h2>
//         <div className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
//           <Skeleton variant="avatar" animation="pulse" rounded="full" />
//           <div className="space-y-2 flex-1">
//             <Skeleton variant="text" width="40%" animation="pulse" />
//             <Skeleton variant="text" width="60%" animation="pulse" />
//             <Skeleton variant="text" width="30%" animation="pulse" />
//           </div>
//         </div>
//       </div>

//       {/* Lesson List Loading */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Lesson List
//         </h2>
//         <div className="space-y-3">
//           {[1, 2, 3, 4, 5].map((i) => (
//             <div
//               key={i}
//               className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
//             >
//               <Skeleton
//                 variant="circular"
//                 width="2rem"
//                 height="2rem"
//                 animation="wave"
//               />
//               <div className="flex-1 space-y-2">
//                 <Skeleton
//                   variant="text"
//                   width={`${70 + i * 5}%`}
//                   animation="wave"
//                 />
//                 <Skeleton variant="text" width="40%" animation="wave" />
//               </div>
//               <Skeleton variant="text" width="4rem" animation="wave" />
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Dashboard Stats */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Dashboard Stats
//         </h2>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
//             <Skeleton
//               variant="circular"
//               width="3rem"
//               height="3rem"
//               animation="pulse"
//               className="mx-auto mb-2"
//             />
//             <Skeleton
//               variant="text"
//               width="80%"
//               animation="pulse"
//               className="mx-auto"
//             />
//           </div>
//           <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
//             <Skeleton
//               variant="circular"
//               width="3rem"
//               height="3rem"
//               animation="pulse"
//               className="mx-auto mb-2"
//             />
//             <Skeleton
//               variant="text"
//               width="60%"
//               animation="pulse"
//               className="mx-auto"
//             />
//           </div>
//           <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
//             <Skeleton
//               variant="circular"
//               width="3rem"
//               height="3rem"
//               animation="pulse"
//               className="mx-auto mb-2"
//             />
//             <Skeleton
//               variant="text"
//               width="70%"
//               animation="pulse"
//               className="mx-auto"
//             />
//           </div>
//           <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
//             <Skeleton
//               variant="circular"
//               width="3rem"
//               height="3rem"
//               animation="pulse"
//               className="mx-auto mb-2"
//             />
//             <Skeleton
//               variant="text"
//               width="50%"
//               animation="pulse"
//               className="mx-auto"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Progress Bars */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Progress Loading
//         </h2>
//         <div className="space-y-3">
//           <div>
//             <Skeleton
//               variant="text"
//               width="30%"
//               animation="wave"
//               className="mb-2"
//             />
//             <Skeleton
//               variant="rectangular"
//               height="0.5rem"
//               animation="wave"
//               rounded="full"
//             />
//           </div>
//           <div>
//             <Skeleton
//               variant="text"
//               width="50%"
//               animation="wave"
//               className="mb-2"
//             />
//             <Skeleton
//               variant="rectangular"
//               height="0.5rem"
//               animation="wave"
//               rounded="full"
//             />
//           </div>
//           <div>
//             <Skeleton
//               variant="text"
//               width="40%"
//               animation="wave"
//               className="mb-2"
//             />
//             <Skeleton
//               variant="rectangular"
//               height="0.5rem"
//               animation="wave"
//               rounded="full"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Notification List */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Notifications
//         </h2>
//         <div className="space-y-2">
//           {[1, 2, 3].map((i) => (
//             <div
//               key={i}
//               className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
//             >
//               <Skeleton
//                 variant="circular"
//                 width="2.5rem"
//                 height="2.5rem"
//                 animation="wave"
//               />
//               <div className="flex-1 space-y-2">
//                 <Skeleton
//                   variant="text"
//                   width={`${60 + i * 10}%`}
//                   animation="wave"
//                 />
//                 <Skeleton variant="text" width="80%" animation="wave" />
//                 <Skeleton variant="text" width="20%" animation="wave" />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Video Player Loading */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black dark:text-white">
//           Video Player
//         </h2>
//         <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
//           <Skeleton variant="rectangular" height="20rem" animation="wave" />
//           <div className="p-4 space-y-3">
//             <Skeleton variant="text" width="70%" animation="wave" />
//             <Skeleton variant="text" width="90%" animation="wave" />
//             <Skeleton variant="text" width="40%" animation="wave" />
//             <div className="flex space-x-2 pt-2">
//               <Skeleton
//                 variant="rectangular"
//                 width="3rem"
//                 height="2rem"
//                 animation="wave"
//                 rounded="md"
//               />
//               <Skeleton
//                 variant="rectangular"
//                 width="3rem"
//                 height="2rem"
//                 animation="wave"
//                 rounded="md"
//               />
//               <Skeleton
//                 variant="rectangular"
//                 width="3rem"
//                 height="2rem"
//                 animation="wave"
//                 rounded="md"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }