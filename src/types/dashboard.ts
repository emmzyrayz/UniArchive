// src/types/dashboard.ts
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