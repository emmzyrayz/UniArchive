// src/components/reader/OfflineSaveButton.tsx
// Saves every page image of a Cloudinary book to the encrypted offline cache.
// Shown on all devices for Cloudinary books: old browsers read these images
// directly, modern ones get them as a backup to the Workbox PDF cache.
"use client";

import { useEffect, useState } from "react";
import { getCachedPageCount } from "@/lib/offlineCache";
import { loadPageImage } from "@/lib/pageImages";
import type { Book } from "@/types/library";

const BATCH_SIZE = 3;
const HIDE_AFTER_MS = 3000;

type SaveState =
  | { status: "checking" }
  | { status: "not-cached" }
  | { status: "caching"; done: number }
  | { status: "cached" }
  | { status: "error" }
  | { status: "hidden" };

export function OfflineSaveButton({
  book,
  numPages,
}: {
  book: Book;
  numPages: number;
}) {
  const totalPages = book.pageCount ?? numPages;
  const [state, setState] = useState<SaveState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    getCachedPageCount(book.id).then(({ cached, total }) => {
      if (cancelled) return;
      // Already saved: nothing to offer
      setState(total > 0 && cached >= total ? { status: "hidden" } : { status: "not-cached" });
    });
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  useEffect(() => {
    if (state.status !== "cached") return;
    const timeout = setTimeout(() => setState({ status: "hidden" }), HIDE_AFTER_MS);
    return () => clearTimeout(timeout);
  }, [state.status]);

  async function save() {
    if (!totalPages) return;
    setState({ status: "caching", done: 0 });
    let done = 0;
    try {
      // A few pages at a time so a slow connection isn't swamped
      for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
        const batch = [];
        for (let p = start; p < start + BATCH_SIZE && p <= totalPages; p++) {
          batch.push(
            loadPageImage(book.id, p, totalPages).then(() => {
              done += 1;
              setState({ status: "caching", done });
            }),
          );
        }
        await Promise.all(batch);
      }
      setState({ status: "cached" });
    } catch {
      setState({ status: "error" });
    }
  }

  if (state.status === "checking" || state.status === "hidden" || !totalPages) {
    return null;
  }

  const base =
    "fixed bottom-24 right-4 z-30 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/40";

  if (state.status === "caching") {
    return (
      <div role="status" className={`${base} bg-neutral-800`}>
        Saving... {state.done}/{totalPages} pages
      </div>
    );
  }

  if (state.status === "cached") {
    return (
      <div role="status" className={`${base} bg-green-700`}>
        ✓ Saved offline
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      className={`${base} bg-neutral-800 hover:bg-neutral-700`}
    >
      {state.status === "error" ? "Save failed — retry?" : "💾 Save offline"}
    </button>
  );
}
