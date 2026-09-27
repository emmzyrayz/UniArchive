// src/types/dashboard.ts
import type { Bookmark, Highlight } from "@/types/reader";

/** A reader bookmark plus the book it's in (GET /api/user/bookmarks). */
export type SavedBookmark = Bookmark & { bookId: string; bookTitle: string };

/** A reader highlight plus the book it's in (GET /api/user/highlights). */
export type SavedHighlight = Highlight & { bookId: string; bookTitle: string };

export interface StorageInfo {
  usedBytes: number;
  totalBytes: number;
  documentCount: number;
}