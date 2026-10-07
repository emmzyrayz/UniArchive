// src/components/reader/OfflineReader.tsx
// Reader for /read/[id] when the service worker has no copy of the page and
// served the /offline fallback instead. The server can't be reached, so the
// book is rebuilt from what the encrypted offline cache knows about it: a
// whole saved PDF (read with pdf.js) or saved page images.
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { ImageReader } from "@/components/reader/ImageReader";
import { getCachedPageCount, getSavedPdf, getSavedPdfInfo } from "@/lib/offlineCache";

// Only browsers that run pdf.js ever save a whole PDF, so loading it is safe
const PdfCanvas = dynamic(() => import("@/components/reader/PdfCanvas").then((mod) => mod.PdfCanvas), {
  ssr: false,
});
import { useReaderNight } from "@/hooks/useReaderNight";
import type { Book } from "@/types/library";

type OfflineBookState =
  | { status: "checking" }
  | { status: "missing" }
  | { status: "saved"; book: Book; file?: Blob };

export function OfflineReader({ bookId }: { bookId: string }) {
  const [state, setState] = useState<OfflineBookState>({ status: "checking" });
  const [night] = useReaderNight();

  useEffect(() => {
    let cancelled = false;
    const savedBook = (title: string | undefined, extra: Partial<Book>): Book => ({
      id: bookId,
      title: title ?? "Saved book",
      fileUrl: "",
      storageProvider: "cloudinary",
      fileSize: 0,
      ownerUpid: "",
      tags: [],
      uploadedAt: "",
      ...extra,
    });
    (async () => {
      const pdf = await getSavedPdfInfo(bookId);
      const file = pdf ? await getSavedPdf(bookId) : null;
      if (cancelled) return;
      if (pdf && file) {
        setState({ status: "saved", book: savedBook(pdf.title, { storageProvider: "backblaze", fileSize: pdf.size }), file });
        return;
      }
      const { cached, total, title } = await getCachedPageCount(bookId);
      if (cancelled) return;
      if (cached === 0) setState({ status: "missing" });
      else setState({ status: "saved", book: savedBook(title, { pageCount: total }) });
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (state.status === "checking") return null;

  if (state.status === "missing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">📡</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            This book isn&apos;t available offline
          </h1>
          <p className="text-text-secondary mb-8">
            Save this book for offline reading while connected.
          </p>
          <Link
            href="/home"
            className="block w-full py-3 px-6 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-neutral-800 transition-colors"
          >
            Open cached library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReaderShell book={state.book}>
      {/* Scrolls sideways when zoomed wider than the screen (see read/[id]/page.tsx) */}
      <div className="overflow-x-auto py-8 px-4">
        <div className={`relative mx-auto w-fit shadow-2xl select-none ${night ? "reader-night" : ""}`}>
          {state.file ? <PdfCanvas book={state.book} file={state.file} /> : <ImageReader book={state.book} cacheOnly />}
        </div>
      </div>
    </ReaderShell>
  );
}
