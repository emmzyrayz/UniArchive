// components/reader/PageListSidebar.tsx
"use client";

import { useReader } from "@/context/readerContext";

export function PageListSidebar() {
  const {
    sidebarOpen,
    numPages,
    currentPage,
    goToPage,
    isPageBookmarked,
    toggleSidebar,
  } = useReader();

  if (!sidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={toggleSidebar}
        aria-hidden
      />
      <div className="fixed top-0 right-0 bottom-0 z-40 w-64 bg-neutral-900 border-l border-neutral-800 pt-14 overflow-y-auto">
        <div className="px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Pages
        </div>
        <ul>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <li key={page}>
              <button
                type="button"
                onClick={() => goToPage(page)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left ${
                  page === currentPage
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60"
                }`}
              >
                <span>Page {page}</span>
                {isPageBookmarked(page) && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-amber-400"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
