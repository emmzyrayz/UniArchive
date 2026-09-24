// src/lib/storageRouter.ts
// Decides where a new upload is stored. Small files go to Cloudinary, which
// can render single pages as images for browsers that can't run pdf.js;
// large files go to Backblaze B2.

export type StorageProvider = "cloudinary" | "backblaze";

// Cloudinary free plan caps uploads at ~10MB.
// Files above this go to B2.
// Upgrade to Cloudinary Plus to raise this limit.
export const CLOUDINARY_MAX_SIZE = 10 * 1024 * 1024; // 10MB free plan limit

export function getStorageProvider(fileSizeBytes: number): StorageProvider {
  return fileSizeBytes <= CLOUDINARY_MAX_SIZE ? "cloudinary" : "backblaze";
}
