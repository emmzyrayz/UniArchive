// components/conversions/PageImagePane.tsx
// The conversion workspace's PDF view on devices that can't run the PDF
// reader: one page image at a time (Cloudinary pages, or the PDF worker's
// page images), via /api/books/[id]/page. Light enough for old phones.
"use client";

import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Loaded = { page: number; url: string } | { page: number; error: string };

export function PageImagePane({
  bookId,
  pageCount,
  page,
  onPageChange,
}: {
  bookId: string;
  pageCount: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/books/${encodeURIComponent(bookId)}/page?page=${page}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { imageUrl?: string; message?: string };
        if (!res.ok || !data.imageUrl) throw new Error(data.message ?? `Couldn't load page ${page}.`);
        setLoaded({ page, url: data.imageUrl });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setLoaded({ page, error: error.message });
      });
    return () => controller.abort();
  }, [bookId, page]);

  const current = loaded?.page === page ? loaded : null;
  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), pageCount));

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-200 dark:bg-neutral-900">
      <div className="flex items-center justify-center gap-3 border-b border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded p-1.5 hover:bg-surface disabled:opacity-40"
        >
          <FiChevronLeft aria-hidden />
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="rounded p-1.5 hover:bg-surface disabled:opacity-40"
        >
          <FiChevronRight aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3">
        {!current && <p className="p-8 text-center text-sm text-text-muted">Loading page {page}…</p>}
        {current && "error" in current && (
          <p role="alert" className="p-8 text-center text-sm text-error">
            {current.error}
          </p>
        )}
        {current && "url" in current && (
          // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL; next/image can't optimise it
          <img src={current.url} alt={`Page ${page}`} className="mx-auto w-full max-w-3xl bg-white shadow" />
        )}
      </div>
    </div>
  );
}
