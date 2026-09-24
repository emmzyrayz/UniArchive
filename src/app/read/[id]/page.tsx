// app/read/[id]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useUser } from "@/context/userContext";
import { useReaderBook } from "@/components/reader/ReaderShell";
import { Watermark } from "@/components/reader/Watermark";
import { EdgeNavOverlay } from "@/components/reader/EdgeNavOverlay";

const PdfCanvas = dynamic(
  () => import("@/components/reader/PdfCanvas").then((mod) => mod.PdfCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-[600px] h-[800px] bg-neutral-800 animate-pulse rounded" />
    ),
  },
);

export default function ReadPage() {
  // Fetched once by the layout, which already handles 401/404/errors
  const book = useReaderBook();
  const { userProfile } = useUser();

  const watermarkLabel =
    userProfile?.upid ?? userProfile?.fullName ?? "UniArchive";

  return (
    <div className="flex justify-center py-8 px-4">
      <div
        className="relative shadow-2xl select-none"
        style={{ userSelect: "none" }}
      >
        <PdfCanvas book={book} />
        <Watermark label={watermarkLabel} />
        <EdgeNavOverlay />
      </div>
    </div>
  );
}
