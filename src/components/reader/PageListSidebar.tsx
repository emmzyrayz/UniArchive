// components/reader/PageListSidebar.tsx
// The reader's side panel: every page (with bookmarks), and a Contents tab
// with the material's table of contents or course outline when it has one.
"use client";

import { useState } from "react";
import { useReader } from "@/context/readerContext";
import { useReaderBook } from "@/components/reader/ReaderShell";
import { OUTLINE_LABELS } from "@/lib/outline";

type Tab = "contents" | "pages";

export function PageListSidebar() {
  const {
    sidebarOpen,
    numPages,
    currentPage,
    goToPage,
    isPageBookmarked,
    toggleSidebar,
  } = useReader();
  const book = useReaderBook();
  const outline = book.outline?.entries.length ? book.outline : null;
  const [tab, setTab] = useState<Tab>(outline ? "contents" : "pages");

  if (!sidebarOpen) return null;

  // The entry the reader is in: the last one starting at or before this page
  let activeEntry = -1;
  outline?.entries.forEach((e, i) => {
    if (e.page && e.page <= currentPage) activeEntry = i;
  });

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={toggleSidebar}
        aria-hidden
      />
      <div className="fixed top-0 right-0 bottom-0 z-40 w-72 bg-neutral-900 border-l border-neutral-800 pt-14 overflow-y-auto">
        {outline ? (
          <div role="tablist" className="flex border-b border-neutral-800 px-2">
            {(["contents", "pages"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-3 text-xs font-medium uppercase tracking-wide ${
                  tab === t
                    ? "border-primary text-white"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {t === "contents" ? OUTLINE_LABELS[outline.kind].title : "Pages"}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Pages
          </div>
        )}

        {outline && tab === "contents" ? (
          <ol className="py-1">
            {outline.entries.map((entry, i) => {
              const content = (
                <>
                  <span className={`min-w-0 flex-1 ${entry.level === 1 ? "font-medium" : ""}`}>{entry.title}</span>
                  {entry.page && (
                    <span className="shrink-0 tabular-nums text-xs text-neutral-500">
                      {entry.pageLabel ?? entry.page}
                    </span>
                  )}
                </>
              );
              const indent = { paddingLeft: 16 + (entry.level - 1) * 14 };
              return (
                <li key={i}>
                  {entry.page ? (
                    <button
                      type="button"
                      onClick={() => goToPage(entry.page!)}
                      style={indent}
                      aria-current={i === activeEntry ? "location" : undefined}
                      className={`flex w-full items-baseline gap-3 py-2 pr-4 text-left text-sm ${
                        i === activeEntry
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-300 hover:bg-neutral-800/60"
                      }`}
                    >
                      {content}
                    </button>
                  ) : (
                    // Course outline topics may have no page
                    <div style={indent} className="flex items-baseline gap-3 py-2 pr-4 text-sm text-neutral-400">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
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
        )}
      </div>
    </>
  );
}
