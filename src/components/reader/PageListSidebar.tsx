// components/reader/PageListSidebar.tsx
// The reader's side panel: every page (with bookmarks), a Contents tab with
// the material's table of contents or course outline when it has one, and
// the reader's highlights with their notes.
"use client";

import { useState } from "react";
import { useReader } from "@/context/readerContext";
import { useReaderBook } from "@/components/reader/ReaderShell";
import { OUTLINE_LABELS } from "@/lib/outline";
import { MAX_NOTE_LENGTH } from "@/lib/constants/annotations";
import type { Highlight } from "@/types/reader";

type Tab = "contents" | "pages" | "highlights";

/** The reader's highlights; `focusId` ("<highlight id>#<request>") opens that one's note editor. */
function HighlightNotes({ focusId }: { focusId: string | null }) {
  const { highlights, goToPage, setHighlightNote, removeHighlight } = useReader();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  // Also runs on mount: the tab often opens because of this request
  const [prevFocus, setPrevFocus] = useState<string | null>(null);
  if (focusId !== prevFocus) {
    setPrevFocus(focusId);
    const id = focusId?.split("#")[0];
    const h = id ? highlights.find((x) => x.id === id) : undefined;
    if (h) setEditing({ id: h.id, text: h.note ?? "" });
  }

  const sorted = [...highlights].sort((a, b) => a.pageNumber - b.pageNumber || a.y - b.y);
  if (sorted.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-neutral-400">
        No highlights yet. Turn on the highlighter in the toolbar and drag over the page, then add a note to any
        highlight here.
      </p>
    );
  }

  const save = (h: Highlight) => {
    if (!editing) return;
    setHighlightNote(h.id, editing.text);
    setEditing(null);
  };

  return (
    <ul className="divide-y divide-neutral-800">
      {sorted.map((h) => {
        const isEditing = editing?.id === h.id;
        return (
          <li key={h.id} className="px-4 py-3">
            <button
              type="button"
              onClick={() => goToPage(h.pageNumber)}
              className="block w-full text-left"
              title={`Go to page ${h.pageNumber}`}
            >
              <span className="text-xs text-neutral-500">Page {h.pageNumber}</span>
              <span className="mt-1 block border-l-2 pl-2 text-sm text-neutral-200 line-clamp-3" style={{ borderColor: h.color }}>
                {h.text ? <>&ldquo;{h.text}&rdquo;</> : <span className="italic text-neutral-400">Highlighted area</span>}
              </span>
            </button>
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  autoFocus
                  value={editing.text}
                  maxLength={MAX_NOTE_LENGTH}
                  onChange={(e) => setEditing({ id: h.id, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(h);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  rows={4}
                  placeholder="Your note"
                  aria-label={`Note for the highlight on page ${h.pageNumber}`}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-primary focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-500">
                    {editing.text.length}/{MAX_NOTE_LENGTH}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => save(h)}
                      className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {h.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-300">📝 {h.note}</p>}
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditing({ id: h.id, text: h.note ?? "" })}
                    className="font-medium text-primary hover:underline"
                  >
                    {h.note ? "Edit note" : "Add note"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHighlight(h.id)}
                    className="text-neutral-400 hover:text-red-400"
                  >
                    Delete highlight
                  </button>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PageListSidebar() {
  const {
    sidebarOpen,
    numPages,
    currentPage,
    goToPage,
    isPageBookmarked,
    toggleSidebar,
    highlights,
    noteRequest,
  } = useReader();
  const book = useReaderBook();
  const outline = book.outline?.entries.length ? book.outline : null;
  const [tab, setTab] = useState<Tab>(outline ? "contents" : "pages");
  // A note marker on the page opens the Highlights tab on that note
  const [seenRequest, setSeenRequest] = useState(noteRequest?.seq ?? 0);
  const [focusId, setFocusId] = useState<string | null>(null);
  if (noteRequest && noteRequest.seq !== seenRequest) {
    setSeenRequest(noteRequest.seq);
    setTab("highlights");
    setFocusId(`${noteRequest.id}#${noteRequest.seq}`);
  }
  // Closing the panel ends the request, so reopening it doesn't reopen the editor
  if (!sidebarOpen && focusId) setFocusId(null);
  const tabs: Tab[] = outline ? ["contents", "pages", "highlights"] : ["pages", "highlights"];
  const tabLabel = (t: Tab) =>
    t === "contents"
      ? OUTLINE_LABELS[outline!.kind].title
      : t === "pages"
        ? "Pages"
        : `Highlights${highlights.length ? ` (${highlights.length})` : ""}`;

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
        <div role="tablist" className="flex border-b border-neutral-800 px-2">
            {tabs.map((t) => (
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
                {tabLabel(t)}
              </button>
            ))}
        </div>

        {tab === "highlights" ? (
          <HighlightNotes focusId={focusId} />
        ) : outline && tab === "contents" ? (
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
