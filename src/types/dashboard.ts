// src/types/dashboard.ts
export interface ReadingStats {
  totalPagesRead: number;
  totalTimeSpentMinutes: number;
  documentsCompleted: number;
  currentStreakDays: number;
  longestStreakDays: number;
  averageSessionMinutes: number;
}

export interface SavedBookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  note?: string;
  createdAt: string;
}

export interface SavedHighlight {
  id: string;
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  excerpt: string;
  createdAt: string;
}

export interface StorageInfo {
  usedBytes: number;
  totalBytes: number;
  documentCount: number;
}