// types/library.ts
export interface Book {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number; // bytes
  pageCount?: number;
  ownerUpid: string;
  tags: string[];
  lastOpenedAt?: string;
  uploadedAt: string;
}
