// src/components/dashboard/HighlightsList.tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { SavedHighlight } from "@/types/dashboard";

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
          key={hl.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        >
          <Link
            href={`/read/${hl.bookId}`}
            className="block rounded-xl border border-border bg-surface-raised p-4 hover:shadow-sm transition-shadow group"
          >
            <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
              {hl.bookTitle} · p.{hl.pageNumber}
            </p>
            <p className="text-sm text-text-primary leading-relaxed border-l-2 border-amber-400 pl-3 group-hover:border-accent transition-colors">
              &ldquo;{hl.excerpt}&rdquo;
            </p>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}