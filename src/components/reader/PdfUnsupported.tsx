// src/components/reader/PdfUnsupported.tsx
// Shown when the device can't run the PDF reader and the book has no page
// images to fall back on (Backblaze books: the PDF worker that makes them is
// off for now, see AGENTS.md). Plain, friendly copy: no internal terms.
// Only the reader's own files can be downloaded; UniLibrary materials from
// others stay protected, as in the reader toolbar.
"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/context/userContext";
import type { Book } from "@/types/library";

export function PdfUnsupported({ book }: { book: Book }) {
  const router = useRouter();
  const { userProfile } = useUser();
  const isOwnFile = !!userProfile?.upid && userProfile.upid === book.ownerUpid;

  return (
    <div className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
      <div className="text-3xl mb-3" aria-hidden="true">
        💻
      </div>
      <p className="font-medium text-neutral-100 mb-1">
        This PDF can&apos;t open on this device
      </p>
      <p className="mb-5">
        Your device can&apos;t show this document here. For the best experience, open it on a PC
        or laptop.
      </p>
      <div className="flex flex-wrap gap-3">
        {isOwnFile && (
          <a
            href={book.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`${book.title}.pdf`}
            className="rounded-full bg-neutral-100 px-4 py-1.5 font-medium text-neutral-900 hover:bg-white"
          >
            Download PDF
          </a>
        )}
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="rounded-full bg-neutral-700 px-4 py-1.5 text-neutral-100 hover:bg-neutral-600"
        >
          Go back
        </button>
      </div>
      {isOwnFile && (
        <p className="mt-4 text-xs text-neutral-500">
          Save it and open it with your device&apos;s PDF app.
        </p>
      )}
    </div>
  );
}
