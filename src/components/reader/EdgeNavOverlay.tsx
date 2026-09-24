// components/reader/EdgeNavOverlay.tsx
"use client";

import { useReader } from "@/context/readerContext";

function ChevronUpIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function EdgeNavOverlay() {
  const { viewMode, highlightMode, currentPage, numPages, nextPage, prevPage } =
    useReader();

  if (viewMode !== "paged" || highlightMode) return null;

   return (
     <div className="absolute inset-0 flex flex-col pointer-events-none">
       {/* Top zone — previous page */}
       <button
         type="button"
         onClick={prevPage}
         disabled={currentPage <= 1}
         aria-label="Previous page"
         className={`
          pointer-events-auto w-full h-1/2 cursor-n-resize
          flex items-start justify-center pt-3
          group transition-opacity
          ${currentPage <= 1 ? "opacity-0 cursor-default" : "opacity-100"}
        `}
       >
         <span
           className={`
          flex items-center justify-center
          w-9 h-9 rounded-full
          bg-black/30 text-white backdrop-blur-sm
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          shadow-lg
        `}
         >
           <ChevronUpIcon />
         </span>
       </button>

       {/* Bottom zone — next page */}
       <button
         type="button"
         onClick={nextPage}
         disabled={currentPage >= numPages}
         aria-label="Next page"
         className={`
          pointer-events-auto w-full h-1/2 cursor-s-resize
          flex items-end justify-center pb-3
          group transition-opacity
          ${currentPage >= numPages ? "opacity-0 cursor-default" : "opacity-100"}
        `}
       >
         <span
           className={`
          flex items-center justify-center
          w-9 h-9 rounded-full
          bg-black/30 text-white backdrop-blur-sm
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          shadow-lg
        `}
         >
           <ChevronDownIcon />
         </span>
       </button>
     </div>
   );
}
