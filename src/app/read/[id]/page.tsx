// app/read/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@/context/userContext";
import { useReader } from "@/context/readerContext";
import { Watermark } from "@/components/reader/Watermark";
import { HighlightLayer } from "@/components/reader/HighlighterLayer";
import { EdgeNavOverlay } from "@/components/reader/EdgeNavOverlay";
import type { Book } from "@/types/library";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

const PdfCanvas = dynamic(
  () => import("@/components/reader/PdfCanvas").then((mod) => mod.PdfCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-[600px] h-[800px] bg-neutral-800 animate-pulse rounded" />
    ),
  },
);

type BookState =
  | { status: "loading" }
  | { status: "ready"; book: Book }
  | { status: "error" };

export default function ReadPage() {
  const { capability } = useDeviceCapability();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useUser();
  const { currentPage } = useReader();
  const [state, setState] = useState<BookState>({ status: "loading" });

  // The layout has already verified access (it 404s otherwise); this fetch
  // only supplies the book to this client component.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GET /api/books/${id} ${response.status}`);
        const { book } = (await response.json()) as { book: Book };
        if (!cancelled) setState({ status: "ready", book });
      })
      .catch((error) => {
        console.error("Failed to load book:", error);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-8 px-4">
        <div className="w-[600px] max-w-full h-[800px] bg-neutral-800 animate-pulse rounded" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex justify-center py-8 px-4">
        <p className="w-[600px] max-w-full p-6 rounded bg-neutral-800 text-sm text-neutral-300">
          Couldn&apos;t load this document. Please refresh the page.
        </p>
      </div>
    );
  }

  const watermarkLabel =
    userProfile?.upid ?? userProfile?.fullName ?? "UniArchive";

  return (
    <div className="flex justify-center py-8 px-4">
      <div
        className="relative shadow-2xl select-none"
        style={{ userSelect: "none" }}
      >
        <PdfCanvas book={state.book} />
        <Watermark label={watermarkLabel} />
        {capability !== "low" && <HighlightLayer pageNumber={currentPage} />}
        <EdgeNavOverlay />
      </div>
    </div>
  );
}
