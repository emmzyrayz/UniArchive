// src/lib/storageRouter.ts
// Decides where a new upload is stored. Small files go to Cloudinary, which
// can render single pages as images for browsers that can't run pdf.js;
// large files go to Backblaze B2.

export type StorageProvider = "cloudinary" | "backblaze";

export const CLOUDINARY_MAX_SIZE = 80 * 1024 * 1024; // 80 MB

export function getStorageProvider(fileSizeBytes: number): StorageProvider {
  return fileSizeBytes <= CLOUDINARY_MAX_SIZE ? "cloudinary" : "backblaze";
}
