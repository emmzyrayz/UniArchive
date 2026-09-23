// components/reader/ReaderShell.tsx
"use client";

import type { ReactNode } from "react";
import { ReaderProvider } from "@/context/readerContext";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { PageListSidebar } from "@/components/reader/PageListSidebar";
import type { Book } from "@/types/library";
import { ViewModeWarningDialog } from "./ViewModeWarningDialog";

export function ReaderShell({
  book,
  children,
}: {
  book: Book;
  children: ReactNode;
}) {
  return (
    <ReaderProvider>
      <div className="min-h-screen bg-neutral-900">
        <ReaderToolbar book={book} />
        <PageListSidebar />
        <ViewModeWarningDialog />
        <div className="pt-14">{children}</div>
      </div>
    </ReaderProvider>
  );
}
