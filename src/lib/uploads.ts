// src/lib/uploads.ts
// Shared rules for book uploads, used by the presign and create routes.

export const BOOK_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const BOOK_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
export const PRESIGN_EXPIRES_SECONDS = 15 * 60;

/** Every book object lives under the uploader's own prefix. */
export function bookKeyPrefix(userId: string): string {
  return `books/${userId}/`;
}

export function isOwnBookKey(storageKey: string, userId: string): boolean {
  return (
    storageKey.startsWith(bookKeyPrefix(userId)) &&
    !storageKey.includes("..") &&
    /^[a-zA-Z0-9/._\-]+$/.test(storageKey)
  );
}

/** Cloudinary public IDs mirror the B2 layout under a uniarchive/ root. */
export function cloudinaryBookPrefix(userId: string): string {
  return `uniarchive/books/${userId}/`;
}

export function isOwnCloudinaryId(publicId: string, userId: string): boolean {
  return (
    publicId.startsWith(cloudinaryBookPrefix(userId)) &&
    !publicId.includes("..") &&
    /^[a-zA-Z0-9/_\-]+$/.test(publicId)
  );
}
