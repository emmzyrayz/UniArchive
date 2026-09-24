// src/components/reader/ImageReader.tsx
// Reader for browsers that can't run pdf.js (old Android WebViews). Shows
// Cloudinary-rendered page images, one page at a time, from the encrypted
// offline cache when available and the network otherwise.
"use client";

import { useEffect, useState } from "react";
import { useReader } from "@/context/readerContext";
import { loadPageImage } from "@/lib/pageImages";
import type { Book } from "@/types/library";

const PREFETCH_AHEAD = 2;

type PageState =
  | { status: "loading" }
  | { status: "ready"; src: string }
  | { status: "error"; message: string };

export function ImageReader({ book }: { book: Book }) {
  const { currentPage, numPages, zoom, setNumPages } = useReader();
  const totalPages = book.pageCount ?? numPages;

  const [page, setPage] = useState<PageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // The page count comes from Cloudinary at upload, not from pdf.js
  useEffect(() => {
    if (book.pageCount) setNumPages(book.pageCount);
  }, [book.pageCount, setNumPages]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setPage({ status: "loading" });
      try {
        const blob = await loadPageImage(book.id, currentPage, totalPages);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPage({ status: "ready", src: objectUrl });
      } catch (error) {
        if (cancelled) return;
        setPage({
          status: "error",
          message: navigator.onLine
            ? error instanceof Error
              ? error.message
              : "Couldn't load this page."
            : "This page isn't saved offline. Reconnect to read it.",
        });
        return;
      }

      // Warm the next pages in the background; failures are harmless here
      for (let p = currentPage + 1; p <= Math.min(currentPage + PREFETCH_AHEAD, totalPages); p++) {
        if (cancelled) return;
        await loadPageImage(book.id, p, totalPages).catch(() => undefined);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book.id, currentPage, totalPages, attempt]);

  const width = { width: `min(${Math.round(600 * zoom)}px, 100%)` };

  if (page.status === "loading") {
    return (
      <div
        style={width}
        className="aspect-[3/4] bg-neutral-800 animate-pulse rounded"
      />
    );
  }

  if (page.status === "error") {
    return (
      <div className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
        <p className="font-medium text-neutral-100 mb-1">
          Couldn&apos;t load page {currentPage}
        </p>
        <p className="mb-4">{page.message}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          // Sits above the page-turn overlay
          className="relative z-10 rounded-full bg-neutral-700 px-4 py-1.5 text-neutral-100 hover:bg-neutral-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- decrypted blob: URL, not optimisable
    <img
      src={page.src}
      alt={`Page ${currentPage} of ${book.title}`}
      style={width}
      className="block h-auto bg-white"
      draggable={false}
    />
  );
}
