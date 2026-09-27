// components/reader/ReaderShell.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ReaderProvider } from "@/context/readerContext";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { PageListSidebar } from "@/components/reader/PageListSidebar";
import type { Book } from "@/types/library";
import { ViewModeWarningDialog } from "./ViewModeWarningDialog";

// The layout fetches the book once; the page reads it from here instead of
// fetching it again (a layout can't pass props to its page directly).
const ReaderBookContext = createContext<Book | null>(null);

const MAX_PAGE = 100_000;

/** ?page=N from links like the dashboard's "Read →"; 1 when absent or bad. */
function pageFromParam(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function useReaderBook(): Book {
  const book = useContext(ReaderBookContext);
  if (!book) throw new Error("useReaderBook must be used within a ReaderShell");
  return book;
}

export function ReaderShell({
  book,
  children,
}: {
  book: Book;
  children: ReactNode;
}) {
  const initialPage = pageFromParam(useSearchParams().get("page"));
  return (
    <ReaderBookContext.Provider value={book}>
      <ReaderProvider bookId={book.id} initialPage={initialPage}>
        <div className="min-h-screen bg-neutral-900">
          <ReaderToolbar book={book} />
          <PageListSidebar />
          <ViewModeWarningDialog />
          <div className="pt-14">{children}</div>
        </div>
      </ReaderProvider>
    </ReaderBookContext.Provider>
  );
}
