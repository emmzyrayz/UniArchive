// src/components/dashboard/HighlightsList.tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { SavedHighlight } from "@/types/dashboard";
import { highlightColorName } from "@/lib/constants/annotations";
import { readerHref, timeAgo } from "./BookmarksList";

export function HighlightsList({ highlights }: { highlights: SavedHighlight[] }) {
  if (highlights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
        <p className="text-text-muted text-sm">No highlights yet — drag to highlight text while reading.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {highlights.map((hl, i) => (
        <motion.li
          key={`${hl.bookId}-${hl.id}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.06 }}
        >
          <Link
            href={readerHref(hl.bookId, hl.pageNumber)}
            className="block rounded-xl border border-border bg-surface-raised p-4 hover:shadow-sm transition-shadow group"
          >
            <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide truncate">
              📄 {hl.bookTitle} · p.{hl.pageNumber}
            </p>
            <p
              className="text-sm text-text-primary leading-relaxed border-l-2 pl-3 line-clamp-3"
              style={{ borderColor: hl.color }}
            >
              {hl.text ? (
                <>&ldquo;{hl.text}&rdquo;</>
              ) : (
                <span className="italic text-text-muted">Highlighted area (no text on this part of the page)</span>
              )}
            </p>
            {hl.note && <p className="text-xs text-text-secondary mt-2 line-clamp-2">{hl.note}</p>}
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-6 rounded-sm"
                  style={{ backgroundColor: hl.color }}
                  aria-hidden
                />
                {highlightColorName(hl.color) ?? "Colour"} highlight · {timeAgo(hl.createdAt)}
              </span>
              <span className="shrink-0 text-sm font-medium text-primary">Read →</span>
            </div>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
