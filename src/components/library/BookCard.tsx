// components/library/BookCard.tsx
"use client";

import { motion } from "motion/react";
import type { Book } from "@/types/library";
import { formatFileSize } from "@/assets/data/libraryData";

export function BookCard({ book }: { book: Book }) {
  return (
    <motion.a
      href={`/read/${book.id}`}
      whileHover={{ y: -3 }}
      className="group block rounded-xl border border-border bg-surface-raised overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
        {book.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-text-muted">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-text-primary text-sm line-clamp-2">
          {book.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          {book.pageCount && <span>{book.pageCount} pages</span>}
          {book.pageCount && <span aria-hidden>·</span>}
          <span>{formatFileSize(book.fileSize)}</span>
        </div>
        {book.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {book.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-neutral-100 text-text-secondary text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.a>
  );
}
