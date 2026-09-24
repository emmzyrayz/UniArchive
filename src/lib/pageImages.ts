// src/lib/pageImages.ts
// Loads one page image of a Cloudinary book: from the encrypted offline cache
// when it's there (works offline), otherwise via /api/books/[id]/page, which
// signs the Cloudinary URL server-side. Network loads are cached as they go.
// cacheOnly never touches the network (the offline reader).
import { cachePageImage, getCachedPageImage } from "@/lib/offlineCache";

async function fetchPageImage(bookId: string, pageNumber: number): Promise<Blob> {
  const res = await fetch(
    `/api/books/${encodeURIComponent(bookId)}/page?page=${pageNumber}`,
    { credentials: "same-origin" },
  );
  if (!res.ok) throw new Error(`Couldn't load page ${pageNumber} (HTTP ${res.status}).`);
  const { imageUrl } = (await res.json()) as { imageUrl: string };

  const image = await fetch(imageUrl);
  if (!image.ok) throw new Error(`Couldn't load page ${pageNumber} (HTTP ${image.status}).`);
  return image.blob();
}

export async function loadPageImage(
  bookId: string,
  pageNumber: number,
  totalPages: number,
  options: { title?: string; cacheOnly?: boolean } = {},
): Promise<Blob> {
  const cached = await getCachedPageImage(bookId, pageNumber);
  if (cached) return cached;
  if (options.cacheOnly) throw new Error(`Page ${pageNumber} isn't saved offline.`);

  const blob = await fetchPageImage(bookId, pageNumber);
  await cachePageImage(bookId, pageNumber, totalPages, blob, options.title);
  return blob;
}
