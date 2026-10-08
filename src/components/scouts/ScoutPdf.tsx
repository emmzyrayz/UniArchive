// components/scouts/ScoutPdf.tsx
// The PDF a Scout task is about: the same viewer as the conversion
// workspace (pdf.js where the device can run it, page images where it
// can't), loaded from GET /api/books/[id] like the reader.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FiMonitor } from "react-icons/fi";
import { canRunModernPdf } from "@/lib/deviceCapability";
import { PageImagePane } from "@/components/conversions/PageImagePane";
import type { WorkspaceBook } from "@/components/conversions/Workspace";

const PdfPane = dynamic(() => import("@/components/pdf/PdfPane"), {
  ssr: false,
  loading: () => <Message>Loading the PDF…</Message>,
});

const noopSubscribe = () => () => {};

function Message({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-muted">{children}</div>;
}

type Load = { bookId: string; book: WorkspaceBook } | { bookId: string; error: string };

export function ScoutPdf({ bookId }: { bookId: string }) {
  const modernPdf = useSyncExternalStore(noopSubscribe, canRunModernPdf, () => null);
  const [load, setLoad] = useState<Load | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/books/${encodeURIComponent(bookId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { book?: WorkspaceBook; message?: string };
        if (!res.ok || !data.book) throw new Error(data.message ?? "Couldn't open this PDF.");
        setLoad({ bookId, book: data.book });
        setPage(1);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setLoad({ bookId, error: e.message });
      });
    return () => controller.abort();
  }, [bookId]);

  const current = load?.bookId === bookId ? load : null;
  if (current && "error" in current) return <Message>{current.error}</Message>;
  if (!current || modernPdf === null) return <Message>Loading the PDF…</Message>;
  const { book } = current;
  if (modernPdf && book.fileUrl) return <PdfPane key={bookId} url={book.fileUrl} />;
  const hasImages = book.storageProvider === "cloudinary" || !!book.hasPageImages;
  if (hasImages && (book.pageCount ?? 0) > 0) {
    return <PageImagePane bookId={book.id} pageCount={book.pageCount!} page={page} onPageChange={setPage} />;
  }
  return (
    <Message>
      <span>
        <FiMonitor aria-hidden className="mx-auto mb-2 text-2xl" />
        This PDF can&apos;t be shown on this device. Skip it, or try this task on a computer.
      </span>
    </Message>
  );
}
