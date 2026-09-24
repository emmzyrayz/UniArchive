// src/components/reader/PdfCanvas.tsx
// Replace the top constants:
// const INITIAL_LOAD = 3;
// const LOAD_INCREMENT = 3;
// With adaptive values from the hook

"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page as PDFPage, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useReader } from "@/context/readerContext";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import type { Book } from "@/types/library";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type FetchCheckState =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "error"; message: string };

export function PdfCanvas({ book }: { book: Book }) {
  const { currentPage, numPages, zoom, viewMode, setNumPages, goToPage } =
    useReader();
  const { config, ready } = useDeviceCapability();

  // Use medium defaults until capability is assessed (avoids SSR mismatch)
  const initialLoad = ready ? config.initial : 5;
  const loadIncrement = ready ? config.increment : 5;

  const [fetchCheck, setFetchCheck] = useState<FetchCheckState>({
    status: "checking",
  });
  const [loadedUpTo, setLoadedUpTo] = useState<number>(initialLoad);
  const [prevFileUrl, setPrevFileUrl] = useState(book.fileUrl);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const lastScrolledPageRef = useRef<number | null>(null);

  // Reset when book changes
  if (prevFileUrl !== book.fileUrl) {
    setPrevFileUrl(book.fileUrl);
    setLoadedUpTo(initialLoad);
  }

  // Preflight check
  useEffect(() => {
    let cancelled = false;
    async function checkFile() {
      try {
        const res = await fetch(book.fileUrl, { method: "HEAD" });
        if (cancelled) return;
        if (!res.ok) {
          setFetchCheck({
            status: "error",
            message: `Document not found (HTTP ${res.status}).`,
          });
          return;
        }
        setFetchCheck({ status: "ok" });
      } catch {
        if (cancelled) return;
        setFetchCheck({
          status: "error",
          message: `Could not reach this document — check your connection.`,
        });
      }
    }
    checkFile();
    return () => {
      cancelled = true;
    };
  }, [book.fileUrl]);

  // Jump ahead if sidebar nav requests a page beyond loaded range
  if (viewMode === "scroll" && numPages && currentPage > loadedUpTo) {
    setLoadedUpTo(Math.min(currentPage, numPages));
  }

  // Sentinel observer — loads more pages as user approaches the end
  useEffect(() => {
    if (viewMode !== "scroll" || !sentinelRef.current || loadedUpTo >= numPages)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadedUpTo((prev) => Math.min(prev + loadIncrement, numPages));
        }
      },
      { root: null, rootMargin: "400px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [viewMode, loadedUpTo, numPages, loadIncrement]);

  // Visibility sync — keeps page counter accurate while scrolling
  useEffect(() => {
    if (viewMode !== "scroll") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const page = Number(visible.target.getAttribute("data-page"));
          if (page) goToPage(page);
        }
      },
      { root: null, threshold: 0.5 },
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [viewMode, loadedUpTo, goToPage]);

  // Programmatic scroll — sidebar clicks, arrow keys
  useEffect(() => {
    if (viewMode !== "scroll" || currentPage > loadedUpTo) return;
    if (lastScrolledPageRef.current === currentPage) return;

    lastScrolledPageRef.current = currentPage;
    isProgrammaticScroll.current = true;

    pageRefs.current.get(currentPage)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    const timeout = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentPage, loadedUpTo, viewMode]);

  if (fetchCheck.status === "checking") {
    return (
      <div className="w-[600px] h-[800px] bg-neutral-800 animate-pulse rounded" />
    );
  }

  if (fetchCheck.status === "error") {
    return (
      <div className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
        <p className="font-medium text-neutral-100 mb-1">
          Couldn&apos;t load this document
        </p>
        <p>{fetchCheck.message}</p>
      </div>
    );
  }

  const loadedPages = numPages
    ? Array.from({ length: Math.min(loadedUpTo, numPages) }, (_, i) => i + 1)
    : [];

  return (
    <Document
      file={book.fileUrl}
      onLoadSuccess={({ numPages }) => {
        setNumPages(numPages);
        setLoadedUpTo(Math.min(initialLoad, numPages));
      }}
      loading={
        <div className="w-[600px] h-[800px] bg-neutral-800 animate-pulse rounded" />
      }
      error={
        <div className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
          Couldn&apos;t parse this file — it may be corrupted.
        </div>
      }
    >
      {viewMode === "paged" ? (
        <PDFPage pageNumber={currentPage} scale={zoom} />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Device capability hint — only shown on low/medium */}
          {ready && config.label && loadedUpTo < numPages && (
            <p className="text-xs text-neutral-500 text-center px-4">
              {config.label}
            </p>
          )}

          {loadedPages.map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
            >
              <PDFPage pageNumber={pageNum} scale={zoom} />
            </div>
          ))}

          {loadedUpTo < numPages && (
            <div
              ref={sentinelRef}
              className="w-full h-8 flex items-center justify-center text-neutral-500 text-xs"
            >
              Loading more pages...
            </div>
          )}
        </div>
      )}
    </Document>
  );
}
