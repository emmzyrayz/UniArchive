"use client";

import { useState } from "react";
import { Tooltip } from "@/components/UI";
import { LuBookmark } from "react-icons/lu";

interface BookmarkButtonProps {
  itemId: string;
  isBookmarked: boolean;
  onToggle: (itemId: string, bookmarked: boolean) => Promise<void> | void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
  variant?: "icon" | "button";
}

export default function BookmarkButton({
  itemId,
  isBookmarked,
  onToggle,
  size = "md",
  showLabel = false,
  showCount = false,
  count = 0,
  className = "",
  variant = "icon",
}: BookmarkButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await onToggle(itemId, !isBookmarked);
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    } finally {
      setLoading(false);
    }
  };

  // Size mappings
  const sizeStyles = {
    sm: {
      icon: "w-4 h-4",
      button: "px-3 py-1.5 text-sm",
      spinner: "w-3 h-3",
    },
    md: {
      icon: "w-5 h-5",
      button: "px-4 py-2 text-base",
      spinner: "w-4 h-4",
    },
    lg: {
      icon: "w-6 h-6",
      button: "px-5 py-2.5 text-lg",
      spinner: "w-5 h-5",
    },
  };

  const styles = sizeStyles[size];

  // Icon-only variant (compact)
  if (variant === "icon") {
    const button = (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          relative rounded-lg transition-all duration-200
          ${
            isBookmarked
              ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              : "text-gray-400 bg-white hover:bg-gray-50 border border-gray-300"
          }
          ${size === "sm" ? "p-1.5" : size === "md" ? "p-2" : "p-2.5"}
          ${loading ? "opacity-50 cursor-not-allowed" : ""}
          ${className}
        `}
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {loading ? (
          <div
            className={`animate-spin rounded-full border-2 border-indigo-600 border-t-transparent ${styles.spinner}`}
          />
        ) : (
          <LuBookmark
            className={styles.icon}
            fill={isBookmarked ? "currentColor" : "none"}
          />
        )}

        {/* Count badge */}
        {showCount && count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    );

    return (
      <Tooltip text={isBookmarked ? "Remove from saved" : "Save for later"}>
        {button}
      </Tooltip>
    );
  }

  // Button variant (with label)
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        flex items-center gap-2 rounded-lg font-medium transition-all duration-200
        ${styles.button}
        ${
          isBookmarked
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-white text-gray-700 border-2 border-gray-300 hover:border-indigo-600 hover:text-indigo-600"
        }
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {loading ? (
        <div
          className={`animate-spin rounded-full border-2 ${
            isBookmarked
              ? "border-white border-t-transparent"
              : "border-indigo-600 border-t-transparent"
          } ${styles.spinner}`}
        />
      ) : (
        <LuBookmark
          className={styles.icon}
          fill={isBookmarked ? "currentColor" : "none"}
        />
      )}

      {showLabel && <span>{isBookmarked ? "Saved" : "Save"}</span>}

      {showCount && count > 0 && (
        <span
          className={`
            px-2 py-0.5 rounded-full text-xs font-bold
            ${
              isBookmarked
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-700"
            }
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Exammple Usage

// 1. Icon Only (Compact)
// tsx<BookmarkButton
//   itemId="material-123"
//   isBookmarked={false}
//   onToggle={handleToggle}
//   size="md"
// />
// 2. With Label
// tsx<BookmarkButton
//   itemId="material-123"
//   isBookmarked={true}
//   onToggle={handleToggle}
//   size="md"
//   variant="button"
//   showLabel
// />
// 3. With Count
// tsx<BookmarkButton
//   itemId="material-123"
//   isBookmarked={false}
//   onToggle={handleToggle}
//   showCount
//   count={24}
//   variant="button"
//   showLabel
// />
// 4. Different Sizes
// tsx{/* Small */}
// <BookmarkButton
//   itemId="material-123"
//   isBookmarked={false}
//   onToggle={handleToggle}
//   size="sm"
// />

// {/* Medium (default) */}
// <BookmarkButton
//   itemId="material-123"
//   isBookmarked={true}
//   onToggle={handleToggle}
//   size="md"
// />

// {/* Large */}
// <BookmarkButton
//   itemId="material-123"
//   isBookmarked={false}
//   onToggle={handleToggle}
//   size="lg"
// />
// 5. Complete Example with API
// tsx"use client";

// import { useState } from "react";
// import { BookmarkButton } from "@/components/complex";

// export default function MaterialCard({ material }) {
//   const [isBookmarked, setIsBookmarked] = useState(material.bookmarked);
//   const [bookmarkCount, setBookmarkCount] = useState(material.bookmarkCount);

//   const handleToggle = async (itemId: string, bookmarked: boolean) => {
//     // Optimistic update
//     setIsBookmarked(bookmarked);
//     setBookmarkCount(prev => bookmarked ? prev + 1 : prev - 1);

//     try {
//       const response = await fetch(`/api/bookmarks/${itemId}`, {
//         method: bookmarked ? "POST" : "DELETE",
//       });

//       if (!response.ok) {
//         // Revert on error
//         setIsBookmarked(!bookmarked);
//         setBookmarkCount(prev => bookmarked ? prev - 1 : prev + 1);
//         throw new Error("Failed to toggle bookmark");
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   return (
//     <div className="border rounded-lg p-4">
//       <h3>{material.title}</h3>
//       <p>{material.description}</p>
      
//       <div className="flex items-center justify-between mt-4">
//         <span className="text-sm text-gray-500">
//           {bookmarkCount} saves
//         </span>
//         <BookmarkButton
//           itemId={material.id}
//           isBookmarked={isBookmarked}
//           onToggle={handleToggle}
//           showCount
//           count={bookmarkCount}
//         />
//       </div>
//     </div>
//   );
// }
// 6. Material Detail Page
// tsx<div className="flex items-center gap-4">
//   <BookmarkButton
//     itemId={material.id}
//     isBookmarked={material.bookmarked}
//     onToggle={handleBookmark}
//     size="lg"
//     variant="button"
//     showLabel
//     showCount
//     count={material.bookmarkCount}
//   />
//   <Button
//     label="Download"
//     icon={<LuDownload />}
//     onClick={handleDownload}
//   />
//   <Button
//     label="Share"
//     icon={<LuShare />}
//     variant="outline"
//     onClick={handleShare}
//   />
// </div>
// 7. Material Grid/List
// tsx<div className="grid grid-cols-3 gap-4">
//   {materials.map((material) => (
//     <Card key={material.id}>
//       <div className="flex justify-between items-start">
//         <h3>{material.title}</h3>
//         <BookmarkButton
//           itemId={material.id}
//           isBookmarked={material.bookmarked}
//           onToggle={handleToggle}
//           size="sm"
//         />
//       </div>
//       {/* ... rest of card ... */}
//     </Card>
//   ))}
// </div>
// 8. Course Enrollment with Save
// tsx<div className="flex gap-2">
//   <Button
//     label="Enroll Now"
//     variant="primary"
//     onClick={handleEnroll}
//     className="flex-1"
//   />
//   <BookmarkButton
//     itemId={course.id}
//     isBookmarked={course.saved}
//     onToggle={handleSave}
//     size="md"
//   />
// </div>
// 🎨 Features:

// ✅ Two variants - Icon-only or button with label
// ✅ Three sizes - sm, md, lg
// ✅ Loading state - Animated spinner
// ✅ Bookmark count - Show save count
// ✅ Count badge - Small notification badge on icon variant
// ✅ Optimistic updates - Instant UI feedback
// ✅ Tooltip - Shows on hover for icon variant
// ✅ Accessible - Proper ARIA labels
// ✅ Smooth animations - Visual transitions