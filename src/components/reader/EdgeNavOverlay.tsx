// components/reader/EdgeNavOverlay.tsx
"use client";

import { useReader } from "@/context/readerContext";

export function EdgeNavOverlay() {
  const { viewMode, highlightMode, currentPage, numPages, nextPage, prevPage } =
    useReader();

  if (viewMode !== "paged" || highlightMode) return null;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      <button
        type="button"
        onClick={prevPage}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className="pointer-events-auto opacity-0 disabled:cursor-default w-full h-1/2 cursor-n-resize"
      />
      <button
        type="button"
        onClick={nextPage}
        disabled={currentPage >= numPages}
        aria-label="Next page"
        className="pointer-events-auto opacity-0 disabled:cursor-default w-full h-1/2 cursor-s-resize"
      />
    </div>
  );
}
