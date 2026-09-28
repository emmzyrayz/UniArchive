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
/** GET /api/user/reading-stats */
export interface ReadingStats {
  totalPagesRead: number;
  totalTimeMinutes: number;
  totalTimeHours: number;
  booksStarted: number;
  booksCompleted: number;
  totalBookmarks: number;
  totalHighlights: number;
  /** Consecutive days with reading, up to today or yesterday */
  currentStreak: number;
  recentBooks: {
    bookId: string;
    title?: string;
    currentPage: number;
    totalPages: number;
    percentComplete: number;
    lastReadAt: string;
  }[];
}
