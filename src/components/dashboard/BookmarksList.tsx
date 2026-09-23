// src/components/dashboard/BookmarksList.tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { SavedBookmark } from "@/types/dashboard";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

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
          key={bm.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        >
          <Link
            href={`/read/${bm.bookId}`}
            className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised p-4 hover:shadow-sm transition-shadow group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
              p.{bm.pageNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate group-hover:underline">
                {bm.bookTitle}
              </p>
              {bm.note && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{bm.note}</p>
              )}
              <p className="text-xs text-text-muted mt-1">{timeAgo(bm.createdAt)}</p>
            </div>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}