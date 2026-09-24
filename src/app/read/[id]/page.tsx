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
import { getCachedPageCount } from "@/lib/offlineCache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const pageSkeleton = () => (
  <div className="w-[600px] h-[800px] bg-neutral-800 animate-pulse rounded" />
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

export default function ReadPage() {
  // Fetched once by the layout, which already handles 401/404/errors
  const book = useReaderBook();
  const { userProfile } = useUser();
  const { numPages } = useReader();
  const modernPdf = useModernPdfSupport();

  const watermarkLabel =
    userProfile?.upid ?? userProfile?.fullName ?? "UniArchive";
  const onCloudinary = book.storageProvider === "cloudinary";
  const online = useOnlineStatus();
  // Offline, a saved Cloudinary book reads from its encrypted page images.
  // Otherwise pdf.js tries the PDF the service worker may have cached.
  const savedOffline = useSavedOffline(book.id, !online && onCloudinary);

  // Old browser + B2 book: nothing to read, and the page-turn overlay
  // would swallow clicks on the card's buttons
  const unsupported = modernPdf === false && !onCloudinary;

  let reader;
  if (modernPdf === null) reader = pageSkeleton();
  else if (!online && onCloudinary && savedOffline === null) reader = pageSkeleton();
  else if (savedOffline) reader = <ImageReader book={book} cacheOnly />;
  else if (modernPdf) reader = <PdfCanvas book={book} />;
  else if (onCloudinary) reader = <ImageReader book={book} />;
  else reader = <PdfUnsupported book={book} />;

  return (
    <div className="flex justify-center py-8 px-4">
      <div
        className="relative shadow-2xl select-none"
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
      {onCloudinary && <OfflineSaveButton book={book} numPages={numPages} />}
    </div>
  );
}
