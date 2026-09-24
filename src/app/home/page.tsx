// app/home/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { BookCard } from "@/components/library/BookCard";
import { EmptyLibrary } from "@/components/library/EmptyLibrary";
import { Button } from "@/components/UI/Buttons";
import type { Book } from "@/types/library";

type LibraryState =
  | { status: "loading" }
  | { status: "ready"; books: Book[] }
  | { status: "error" };

export default function HomePage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, getUserDisplayName } = useUser();
  const [library, setLibrary] = useState<LibraryState>({ status: "loading" });
  // Bumped by the retry button to re-run the fetch without a full page reload
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  useEffect(() => {
    if (isLoading || !hasActiveSession) return;
    let cancelled = false;

    fetch("/api/books?limit=50", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GET /api/books ${response.status}`);
        const data = (await response.json()) as { books: Book[] };
        if (!cancelled) setLibrary({ status: "ready", books: data.books });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load library:", error);
        setLibrary({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, hasActiveSession, reloadKey]);

  // Send uploads queued while offline: now, when the connection returns, and
  // when the service worker's background sync asks. Refresh the library if
  // any went through.
  useEffect(() => {
    if (isLoading || !hasActiveSession) return;
    let cancelled = false;

    const run = () => {
      if (!navigator.onLine) return;
      import("@/utils/uploadQueue")
        .then(({ processQueue }) => processQueue())
        .then(({ processed }) => {
          if (!cancelled && processed > 0) setReloadKey((k) => k + 1);
        })
        .catch((error) => console.error("Failed to process upload queue:", error));
    };
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === "PROCESS_UPLOAD_QUEUE") run();
    };

    run();
    window.addEventListener("online", run);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [isLoading, hasActiveSession]);

  if (isLoading || (hasActiveSession && library.status === "loading")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary text-sm">Loading your library...</p>
      </div>
    );
  }

  if (!hasActiveSession) {
    return null; // redirect in flight
  }

  if (library.status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-text-secondary text-sm">
          We couldn&apos;t load your library. Check your connection and try again.
        </p>
        <Button
          onClick={() => {
            setLibrary({ status: "loading" });
            setReloadKey((k) => k + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const myBooks = library.status === "ready" ? library.books : [];
  const recentlyOpened = myBooks
    .filter((b) => b.lastOpenedAt)
    .sort(
      (a, b) =>
        new Date(b.lastOpenedAt!).getTime() -
        new Date(a.lastOpenedAt!).getTime(),
    );

  return (
    <div className="min-h-screen mt-[60px] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {getUserDisplayName()}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {myBooks.length} document{myBooks.length !== 1 ? "s" : ""} in your
              library
            </p>
          </div>
          <Button href="/upload">Upload a document</Button>
        </motion.div>

        {myBooks.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            {recentlyOpened.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Continue reading
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recentlyOpened.map((book, i) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <BookCard book={book} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                All documents
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {myBooks.map((book, i) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <BookCard book={book} />
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
