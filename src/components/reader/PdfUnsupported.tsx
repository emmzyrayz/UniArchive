// src/components/reader/PdfUnsupported.tsx
// Shown when the browser can't run pdf.js and the book is on B2, which has no
// page-image rendering to fall back on.
"use client";

import { useRouter } from "next/navigation";
import type { Book } from "@/types/library";

export function PdfUnsupported({ book }: { book: Book }) {
  const router = useRouter();

  return (
    <div className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
      <div className="text-3xl mb-3" aria-hidden="true">
        ⚠️
      </div>
      <p className="font-medium text-neutral-100 mb-1">
        Your browser can&apos;t display this PDF
      </p>
      <p className="mb-5">
        This file is too large for image rendering. Update Chrome or Android
        System WebView to read it.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <a
          href={book.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-neutral-100 px-4 py-1.5 font-medium text-neutral-900 hover:bg-white"
        >
          Open PDF
        </a>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="rounded-full bg-neutral-700 px-4 py-1.5 text-neutral-100 hover:bg-neutral-600"
        >
          Go back
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Update Chrome or Android System WebView in the Play Store.
      </p>
    </div>
  );
}
