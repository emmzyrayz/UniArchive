// app/read/[id]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useUser } from "@/context/userContext";
import { useReader } from "@/context/readerContext";
import { useReaderBook } from "@/components/reader/ReaderShell";
import { Watermark } from "@/components/reader/Watermark";
import { EdgeNavOverlay } from "@/components/reader/EdgeNavOverlay";
import { PdfUnsupported } from "@/components/reader/PdfUnsupported";
import { OfflineSaveButton } from "@/components/reader/OfflineSaveButton";
import { canRunModernPdf } from "@/lib/deviceCapability";
import { getCachedPageCount, getSavedPdf } from "@/lib/offlineCache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReaderNight } from "@/hooks/useReaderNight";

const pageSkeleton = () => (
  <div className="w-[600px] max-w-full h-[800px] bg-neutral-800 animate-pulse rounded" />
);

// pdf.js 6 won't even parse on browsers without class static blocks, so its
// chunk must only be requested once we know the browser can run it.
const PdfCanvas = dynamic(
  () => import("@/components/reader/PdfCanvas").then((mod) => mod.PdfCanvas),
  { ssr: false, loading: pageSkeleton },
);

const ImageReader = dynamic(
  () => import("@/components/reader/ImageReader").then((mod) => mod.ImageReader),
  { ssr: false, loading: pageSkeleton },
);

const noopSubscribe = () => () => {};

/** null until hydrated, then whether this browser can run pdf.js. */
function useModernPdfSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, canRunModernPdf, () => null);
}

/**
 * Whether this book has page images saved offline. Only checked while
 * offline and for Cloudinary books; null while unknown.
 */
function useSavedOffline(bookId: string, check: boolean): boolean | null {
  const [saved, setSaved] = useState<{ bookId: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!check) return;
    let cancelled = false;
    getCachedPageCount(bookId).then(({ cached }) => {
      if (!cancelled) setSaved({ bookId, value: cached > 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, check]);

  return check && saved?.bookId === bookId ? saved.value : null;
}

/**
 * The PDF this device saved for offline reading (offlineCache), decrypted:
 * undefined while looking, null when there's none. Only checked when `check`.
 */
function useSavedPdf(bookId: string, check: boolean): Blob | null | undefined {
  const [saved, setSaved] = useState<{ bookId: string; file: Blob | null } | null>(null);

  useEffect(() => {
    if (!check) return;
    let cancelled = false;
    getSavedPdf(bookId).then((file) => {
      if (!cancelled) setSaved({ bookId, file });
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, check]);

  if (!check) return null;
  return saved?.bookId === bookId ? saved.file : undefined;
}

export default function ReadPage() {
  // Fetched once by the layout, which already handles 401/404/errors
  const book = useReaderBook();
  const { userProfile } = useUser();
  const { numPages } = useReader();
  const modernPdf = useModernPdfSupport();
  const [night] = useReaderNight();

  const watermarkLabel =
    userProfile?.upid ?? userProfile?.fullName ?? "UniArchive";
  // Page images: Cloudinary renders them; the PDF worker makes them for
  // Backblaze books (book.hasPageImages)
  const hasImages = book.storageProvider === "cloudinary" || !!book.hasPageImages;
  const online = useOnlineStatus();
  // Offline, a saved book with page images reads from its encrypted copies.
  // Otherwise pdf.js tries the PDF the service worker may have cached.
  const savedOffline = useSavedOffline(book.id, !online && hasImages);
  // Backblaze books on browsers that run pdf.js can be saved whole and are
  // then read from this device, online or not (no data used)
  const pdfSaveMode = modernPdf === true && !hasImages;
  const savedPdf = useSavedPdf(book.id, pdfSaveMode);

  // Old browser + no page images: nothing to read, and the page-turn overlay
  // would swallow clicks on the card's buttons
  const unsupported = modernPdf === false && !hasImages;

  let reader;
  if (modernPdf === null) reader = pageSkeleton();
  else if (pdfSaveMode && savedPdf === undefined) reader = pageSkeleton();
  else if (pdfSaveMode && savedPdf) reader = <PdfCanvas book={book} file={savedPdf} />;
  else if (!online && hasImages && savedOffline === null) reader = pageSkeleton();
  else if (savedOffline) reader = <ImageReader book={book} cacheOnly />;
  else if (modernPdf) reader = <PdfCanvas book={book} />;
  else if (hasImages) reader = <ImageReader book={book} />;
  else reader = <PdfUnsupported book={book} />;

  return (
    // Scrolls sideways when a page is zoomed wider than the screen; mx-auto
    // centres it otherwise (flex centring would cut off its left edge)
    <div className="overflow-x-auto py-8 px-4">
      <div
        className={`relative mx-auto w-fit shadow-2xl select-none ${night ? "reader-night" : ""}`}
        style={{ userSelect: "none" }}
      >
        {reader}
        {!unsupported && (
          <>
            <Watermark label={watermarkLabel} />
            <EdgeNavOverlay />
          </>
        )}
      </div>
      {hasImages && <OfflineSaveButton book={book} numPages={numPages} mode="images" />}
      {pdfSaveMode && <OfflineSaveButton book={book} numPages={numPages} mode="pdf" />}
    </div>
  );
}
