// src/assets/data/dashboardData.ts
import type { ReadingStats, SavedBookmark, SavedHighlight, StorageInfo } from "@/types/dashboard";

export const MOCK_READING_STATS: ReadingStats = {
  totalPagesRead: 847,
  totalTimeSpentMinutes: 14520,
  documentsCompleted: 8,
  currentStreakDays: 5,
  longestStreakDays: 12,
  averageSessionMinutes: 42,
};

export const MOCK_BOOKMARKS: SavedBookmark[] = [
  {
    id: "bm-1",
    bookId: "book-1",
    bookTitle: "Linear Algebra I — Lecture Notes",
    pageNumber: 12,
    note: "Important theorem — revisit before exam",
    createdAt: "2024-03-14T10:00:00Z",
  },
  {
    id: "bm-2",
    bookId: "book-2",
    bookTitle: "Data Structures Past Questions 2019-2023",
    pageNumber: 8,
    note: "Recurring question pattern: linked list reversal",
    createdAt: "2024-03-10T14:30:00Z",
  },
  {
    id: "bm-3",
    bookId: "book-3",
    bookTitle: "Intro to Thermodynamics — Textbook Scan",
    pageNumber: 45,
    note: "Key formula for entropy calculation",
    createdAt: "2024-03-05T09:00:00Z",
  },
];

export const MOCK_HIGHLIGHTS: SavedHighlight[] = [
  {
    id: "hl-1",
    bookId: "book-1",
    bookTitle: "Linear Algebra I — Lecture Notes",
    pageNumber: 5,
    excerpt: "A vector space V over a field F is a set with two operations: vector addition and scalar multiplication.",
    createdAt: "2024-03-14T10:15:00Z",
  },
  {
    id: "hl-2",
    bookId: "book-1",
    bookTitle: "Linear Algebra I — Lecture Notes",
    pageNumber: 23,
    excerpt: "Eigenvalues λ satisfy the characteristic equation det(A - λI) = 0.",
    createdAt: "2024-03-14T11:00:00Z",
  },
  {
    id: "hl-3",
    bookId: "book-3",
    bookTitle: "Intro to Thermodynamics — Textbook Scan",
    pageNumber: 12,
    excerpt: "The first law of thermodynamics: energy can neither be created nor destroyed.",
    createdAt: "2024-03-10T08:30:00Z",
  },
];

export const MOCK_STORAGE: StorageInfo = {
  usedBytes: 23_550_000,
  totalBytes: 524_288_000,
  documentCount: 3,
};

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}