// src/components/reader/OfflineSaveButton.tsx
// Saves a book for offline reading, encrypted on this device:
//  - "images": every page image of a Cloudinary book. Shown on all devices:
//    old browsers read these images directly, modern ones get them as a
//    backup to the Workbox PDF cache.
//  - "pdf": the whole PDF, for Backblaze books on browsers that run pdf.js
//    (the device renders it; no server page images needed). Capped by the
//    device's RAM (offlinePdfMaxBytes).
// Once saved, a small chip offers to remove the copy.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  OfflineSaveError,
  getCachedPageCount,
  getSavedPdfInfo,
  removeCachedBook,
  savePdfOffline,
} from "@/lib/offlineCache";
import { loadPageImage } from "@/lib/pageImages";
import { offlinePdfMaxBytes } from "@/lib/deviceCapability";
import type { Book } from "@/types/library";

const BATCH_SIZE = 3;
const SHOW_DONE_MS = 3000;

type SaveState =
  | { status: "checking" }
  | { status: "not-saved" }
  | { status: "saving"; done: number; total: number }
  | { status: "just-saved" }
  | { status: "saved" }
  | { status: "confirm-remove" }
  | { status: "error"; message: string }
  | { status: "unavailable" };

const deviceMemory = () => (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

export function OfflineSaveButton({
  book,
  numPages,
  mode,
}: {
  book: Book;
  numPages: number;
  mode: "images" | "pdf";
}) {
  const totalPages = book.pageCount ?? numPages;
  const [state, setState] = useState<SaveState>({ status: "checking" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check =
      mode === "pdf"
        ? getSavedPdfInfo(book.id).then((info) => {
            if (info) return { status: "saved" } as const;
            return book.fileSize > offlinePdfMaxBytes(deviceMemory())
              ? ({ status: "unavailable" } as const)
              : ({ status: "not-saved" } as const);
          })
        : getCachedPageCount(book.id).then(({ cached, total }) =>
            total > 0 && cached >= total ? ({ status: "saved" } as const) : ({ status: "not-saved" } as const),
          );
    check.then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [book.id, book.fileSize, mode]);

  useEffect(() => {
    if (state.status !== "just-saved") return;
    const timeout = setTimeout(() => setState({ status: "saved" }), SHOW_DONE_MS);
    return () => clearTimeout(timeout);
  }, [state.status]);

  async function saveImages() {
    if (!totalPages) return;
    setState({ status: "saving", done: 0, total: totalPages });
    let done = 0;
    try {
      // A few pages at a time so a slow connection isn't swamped
      for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
        const batch = [];
        for (let p = start; p < start + BATCH_SIZE && p <= totalPages; p++) {
          batch.push(
            loadPageImage(book.id, p, totalPages, { title: book.title }).then(() => {
              done += 1;
              setState({ status: "saving", done, total: totalPages });
            }),
          );
        }
        await Promise.all(batch);
      }
      setState({ status: "just-saved" });
    } catch {
      setState({ status: "error", message: "Save failed" });
    }
  }

  async function savePdf() {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "saving", done: 0, total: book.fileSize });
    try {
      await savePdfOffline(book.id, book.fileUrl, {
        title: book.title,
        expectedSize: book.fileSize,
        signal: controller.signal,
        onProgress: (done, total) => setState({ status: "saving", done, total: total || book.fileSize }),
      });
      setState({ status: "just-saved" });
    } catch (error) {
      if (controller.signal.aborted) setState({ status: "not-saved" });
      else setState({ status: "error", message: error instanceof OfflineSaveError ? error.message : "Save failed" });
    } finally {
      abortRef.current = null;
    }
  }

  async function remove() {
    await removeCachedBook(book.id);
    setState({ status: "not-saved" });
  }

  if (state.status === "checking" || state.status === "unavailable" || (mode === "images" && !totalPages)) {
    return null;
  }

  const base =
    "fixed bottom-24 right-4 z-30 max-w-[calc(100vw-2rem)] rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/40";

  if (state.status === "saving") {
    const label =
      mode === "pdf"
        ? `Saving... ${state.total ? Math.min(99, Math.floor((state.done / state.total) * 100)) : 0}%`
        : `Saving... ${state.done}/${state.total} pages`;
    return (
      <div role="status" className={`${base} flex items-center gap-3 bg-neutral-800`}>
        <span>{label}</span>
        {mode === "pdf" && (
          <button type="button" onClick={() => abortRef.current?.abort()} className="text-xs text-neutral-300 underline">
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (state.status === "just-saved") {
    return (
      <div role="status" className={`${base} bg-green-700`}>
        ✓ Saved offline
      </div>
    );
  }

  if (state.status === "saved") {
    return (
      <button
        type="button"
        onClick={() => setState({ status: "confirm-remove" })}
        className="fixed bottom-24 right-4 z-30 rounded-full bg-neutral-800/80 px-3 py-1.5 text-xs text-neutral-300 shadow-lg shadow-black/40 hover:bg-neutral-700"
        title="This book is saved on this device. Click to remove the offline copy."
      >
        ✓ Offline
      </button>
    );
  }

  if (state.status === "confirm-remove") {
    return (
      <div role="dialog" aria-label="Remove offline copy" className={`${base} flex items-center gap-3 bg-neutral-800`}>
        <span>Remove the offline copy?</span>
        <button type="button" onClick={remove} className="text-xs font-semibold text-red-300 underline">
          Remove
        </button>
        <button type="button" onClick={() => setState({ status: "saved" })} className="text-xs text-neutral-300 underline">
          Keep
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={mode === "pdf" ? savePdf : saveImages}
      className={`${base} bg-neutral-800 hover:bg-neutral-700`}
      title={state.status === "error" ? state.message : undefined}
    >
      {state.status === "error" ? `${state.message}. Retry?` : "💾 Save offline"}
    </button>
  );
}
