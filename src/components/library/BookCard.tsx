// components/library/BookCard.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Book } from "@/types/library";
import { formatFileSize } from "@/assets/data/libraryData";

interface BookCardProps {
  book: Book;
  onDelete?: (bookId: string) => void;
  showDeleteButton?: boolean;
}

type DeleteState = "idle" | "confirming" | "deleting";

export function BookCard({ book, onDelete, showDeleteButton = false }: BookCardProps) {
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Let the error message fade out on its own
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const handleDelete = async () => {
    setDeleteState("deleting");
    setError(null);
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? `DELETE /api/books/${book.id} ${response.status}`);
      }
      // Drop any encrypted offline copy too; best-effort, never throws
      import("@/lib/offlineCache").then(({ removeCachedBook }) => removeCachedBook(book.id));
      onDelete?.(book.id);
    } catch (err) {
      console.error("Failed to delete book:", err);
      setError("Couldn't delete. Try again.");
      setDeleteState("idle");
    }
  };

  return (
    <motion.div whileHover={{ y: -3 }} className="group relative">
      <a
        href={`/read/${book.id}`}
        className="block rounded-xl border border-border bg-surface-raised overflow-hidden hover:shadow-md transition-shadow"
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
      </a>

      {/* Sibling of the link, not inside it: a button can't be nested in an <a> */}
      {showDeleteButton && deleteState === "idle" && (
        <button
          type="button"
          aria-label={`Delete ${book.title}`}
          onClick={() => setDeleteState("confirming")}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-surface-raised/90 border border-border text-text-secondary hover:text-error flex items-center justify-center shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      )}

      {showDeleteButton && deleteState !== "idle" && (
        <div className="absolute inset-0 rounded-xl bg-surface-raised/95 border border-border flex flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm text-text-primary">
            Delete this book? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteState("idle")}
              disabled={deleteState === "deleting"}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteState === "deleting"}
              className="px-3 py-1.5 rounded-lg bg-error text-white text-sm font-medium disabled:opacity-50"
            >
              {deleteState === "deleting" ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="absolute left-2 right-2 bottom-2 rounded-md bg-error/10 text-error text-xs px-2 py-1 text-center"
        >
          {error}
        </p>
      )}
    </motion.div>
  );
}
