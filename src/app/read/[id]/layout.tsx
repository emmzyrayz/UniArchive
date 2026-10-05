// app/read/[id]/layout.tsx
// Loads the book with the same code as GET /api/books/[id]
// (lib/readerBook.ts), straight from the session cookie, instead of calling
// our own API over HTTP. That self-call went through NEXT_PUBLIC_APP_URL
// with the cookies copied over, and a redirect on the way dropped them, so
// signed-in readers were bounced to sign in (and then home) in a loop.
import { notFound, redirect } from "next/navigation";
import { ReaderShell } from "@/components/reader/ReaderShell";
import type { Book } from "@/types/library";
import { privateMetadata } from "@/lib/seo";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { openBookForReader } from "@/lib/readerBook";

// A reader page is someone's own book: never indexed
export const metadata = privateMetadata("Reader");

export default async function ReadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSessionUser();
  if (!session) {
    // Come back to this book after signing in
    redirect(`/auth?view=signin&from=${encodeURIComponent(`/read/${id}`)}`);
  }

  const opened = await openBookForReader(id, session);
  // Covers both "doesn't exist" and "not yours" (deliberately the same)
  if (opened.kind === "not_found") notFound();
  if (opened.kind === "storage_unavailable") {
    throw new Error(`Storage is unavailable for book ${id}. Please try again.`);
  }

  return <ReaderShell book={opened.book as Book}>{children}</ReaderShell>;
}
