// src/components/dashboard/BookmarksList.tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { SavedBookmark } from "@/types/dashboard";

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/** Opens the reader on the saved page. */
export const readerHref = (bookId: string, pageNumber: number) =>
  `/read/${bookId}?page=${pageNumber}`;

export function BookmarksList({ bookmarks }: { bookmarks: SavedBookmark[] }) {
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
        <p className="text-text-muted text-sm">No bookmarks yet — bookmark a page while reading to see it here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bookmarks.map((bm, i) => (
        <motion.li
          key={`${bm.bookId}-${bm.id}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.06 }}
        >
          <Link
            href={readerHref(bm.bookId, bm.pageNumber)}
            className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised p-4 hover:shadow-sm transition-shadow group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
              p.{bm.pageNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate group-hover:underline">
                📄 {bm.bookTitle}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                Page {bm.pageNumber}
                {bm.label && <> · &ldquo;{bm.label}&rdquo;</>}
              </p>
              <p className="text-xs text-text-muted mt-1">{timeAgo(bm.createdAt)}</p>
            </div>
            <span className="self-center shrink-0 text-sm font-medium text-primary">Read →</span>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
