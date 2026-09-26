// components/reader/ReaderToolbar.tsx
"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useReader } from "@/context/readerContext";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { canRunModernPdf } from "@/lib/deviceCapability";
import type { Book } from "@/types/library";

const noopSubscribe = () => () => {};

export function ReaderToolbar({ book }: { book: Book }) {
  const {
    currentPage,
    numPages,
    zoom,
    highlightMode,
    sidebarOpen,
    nextPage,
    prevPage,
    setZoom,
    toggleSidebar,
    toggleHighlightMode,
    toggleBookmark,
    isPageBookmarked,
    viewMode,
    requestViewModeChange,
  } = useReader();

  const { capability, ready } = useDeviceCapability();
  // null on the server; the same check read/[id]/page.tsx routes on
  const modernPdf = useSyncExternalStore(noopSubscribe, canRunModernPdf, () => null);
  // Old browsers read Cloudinary page images instead of running pdf.js
  // (Backblaze books show an "unsupported" message instead, not images)
  const imageMode = modernPdf === false && book.storageProvider === "cloudinary";
  const bookmarked = isPageBookmarked(currentPage);

  // Only hide scroll mode once capability is assessed — avoids layout shift
  const canUseScrollMode = !ready || capability !== "low";

  return (
    <div className="fixed top-0 inset-x-0 z-30 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/home"
            className="text-neutral-400 hover:text-white shrink-0"
            aria-label="Back to library"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-medium text-white truncate">
            {book.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Page navigation */}
          <button
            type="button"
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-xs text-neutral-400 min-w-[64px] text-center">
            {currentPage} / {numPages || "…"}
          </span>
          <button
            type="button"
            onClick={nextPage}
            disabled={currentPage >= numPages}
            className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Zoom */}
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
            className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800"
            aria-label="Zoom out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="text-xs text-neutral-400 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(Math.min(2.4, zoom + 0.2))}
            className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800"
            aria-label="Zoom in"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Highlight */}
          <button
            type="button"
            onClick={toggleHighlightMode}
            className={`p-2 rounded-md ${highlightMode ? "bg-amber-500/20 text-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
            aria-label="Toggle highlight mode"
            aria-pressed={highlightMode}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 17l6-6 4 4 8-8M21 3v6h-6" />
            </svg>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={() => toggleBookmark(currentPage)}
            className={`p-2 rounded-md ${bookmarked ? "text-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
            aria-pressed={bookmarked}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </button>

          {/* Page list sidebar */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={`p-2 rounded-md ${sidebarOpen ? "bg-neutral-800 text-white" : "text-neutral-300 hover:bg-neutral-800"}`}
            aria-label="Toggle page list"
            aria-pressed={sidebarOpen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* View mode toggle — hidden on low-end devices */}
          {canUseScrollMode ? (
            <button
              type="button"
              onClick={() =>
                requestViewModeChange(viewMode === "paged" ? "scroll" : "paged")
              }
              className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800 text-xs"
              aria-label="Toggle view mode"
            >
              {viewMode === "paged" ? "Scroll view" : "Page view"}
            </button>
          ) : (
            <span
              className="text-xs text-neutral-600 px-2"
              title="Scroll view is unavailable on this device to save memory"
            >
              Page view
            </span>
          )}

          {/* Download disabled */}
          <button
            type="button"
            disabled
            title="Downloading is disabled for protected materials"
            className="p-2 rounded-md text-neutral-600 cursor-not-allowed"
            aria-label="Download disabled"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reader notices — sit below the toolbar */}
      {imageMode ? (
        <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
          <p className="text-xs text-amber-400/80 text-center">
            Your browser can&apos;t run the PDF viewer — showing page images instead
          </p>
        </div>
      ) : (
        ready &&
        capability === "low" && (
          <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-xs text-amber-400/80 text-center">
              Lightweight mode active — scroll view disabled to save memory
            </p>
          </div>
        )
      )}
    </div>
  );
}
