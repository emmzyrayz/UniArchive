// src/components/reader/OfflineReader.tsx
// Reader for /read/[id] when the service worker has no copy of the page and
// served the /offline fallback instead. The server can't be reached, so the
// book is rebuilt from what the encrypted offline cache knows about it.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { ImageReader } from "@/components/reader/ImageReader";
import { getCachedPageCount } from "@/lib/offlineCache";
import type { Book } from "@/types/library";

type OfflineBookState =
  | { status: "checking" }
  | { status: "missing" }
  | { status: "saved"; book: Book };

export function OfflineReader({ bookId }: { bookId: string }) {
  const [state, setState] = useState<OfflineBookState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    getCachedPageCount(bookId).then(({ cached, total, title }) => {
      if (cancelled) return;
      if (cached === 0) {
        setState({ status: "missing" });
        return;
      }
      setState({
        status: "saved",
        book: {
          id: bookId,
          title: title ?? "Saved book",
          fileUrl: "",
          storageProvider: "cloudinary",
          fileSize: 0,
          pageCount: total,
          ownerUpid: "",
          tags: [],
          uploadedAt: "",
        },
      });
    });
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
      <div className="flex justify-center py-8 px-4">
        <div className="relative shadow-2xl select-none">
          <ImageReader book={state.book} cacheOnly />
        </div>
      </div>
    </ReaderShell>
  );
}
