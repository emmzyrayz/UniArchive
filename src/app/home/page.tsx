// app/home/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiFileText, FiX } from "react-icons/fi";
import { SUBMISSION_SUCCESS_KEY } from "@/lib/constants/submissions";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { BookCard } from "@/components/library/BookCard";
import { EmptyLibrary } from "@/components/library/EmptyLibrary";
import { Button } from "@/components/UI/Buttons";
import type { Book } from "@/types/library";

interface ActiveSubmission {
  _id: string;
  bookId: string;
  title: string;
  bookTitle: string;
  status: "submitted" | "in_review";
  facultyName?: string;
  submittedAt?: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [
    [86400 * 30, "month"],
    [86400 * 7, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

function readSubmissionSuccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SUBMISSION_SUCCESS_KEY) === "1";
  } catch {
    return false;
  }
}

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
  const [submissions, setSubmissions] = useState<{ items: ActiveSubmission[]; total: number }>({
    items: [],
    total: 0,
  });
  // Read once. The loading screen is what hydrates, so reading storage in
  // the initializer can't cause a hydration mismatch.
  const [showSubmittedBanner, setShowSubmittedBanner] = useState(readSubmissionSuccess);

  useEffect(() => {
    if (!showSubmittedBanner) return;
    try {
      sessionStorage.removeItem(SUBMISSION_SUCCESS_KEY);
    } catch {
      // storage blocked; the banner still shows this once
    }
  }, [showSubmittedBanner]);

  // Submissions under review, shown above the library. Not critical: on
  // failure the section just doesn't appear.
  useEffect(() => {
    if (isLoading || !hasActiveSession) return;
    const controller = new AbortController();
    fetch("/api/submissions?status=submitted,in_review&limit=3", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { submissions: ActiveSubmission[]; total: number };
        setSubmissions({ items: data.submissions, total: data.total });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load submissions:", error);
        }
      });
    return () => controller.abort();
  }, [isLoading, hasActiveSession, reloadKey]);

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

  const removeBook = (id: string) =>
    setLibrary((prev) =>
      prev.status === "ready"
        ? { ...prev, books: prev.books.filter((b) => b.id !== id) }
        : prev,
    );

  const openSubmission = (bookId: string) => router.push(`/submit?bookId=${bookId}`);

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

        {showSubmittedBanner && (
          <div
            role="status"
            className="mb-8 flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
          >
            <FiCheckCircle className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
            <p className="flex-1 text-sm text-text-primary">
              Your document has been submitted for review! We&apos;ll notify you when it&apos;s
              approved.
            </p>
            <button
              type="button"
              onClick={() => setShowSubmittedBanner(false)}
              aria-label="Dismiss"
              className="shrink-0 text-text-muted hover:text-text-primary"
            >
              <FiX />
            </button>
          </div>
        )}

        {submissions.items.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
              Your submissions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {submissions.items.map((s) => (
                <div
                  key={s._id}
                  className="flex gap-3 rounded-xl border border-border bg-surface-raised p-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <FiFileText />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">{s.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        In Review
                      </span>
                      {s.facultyName && <> • {s.facultyName}</>}
                    </p>
                    {s.submittedAt && (
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                        <FiClock size={11} /> Submitted {timeAgo(s.submittedAt)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => openSubmission(s.bookId)}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      View Submission
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {submissions.total > submissions.items.length && (
              <p className="text-xs text-text-muted mt-3">
                and {submissions.total - submissions.items.length} more in review. Look for the
                In Review badge under{" "}
                <Link href="#all-documents" className="text-primary hover:underline">
                  All documents
                </Link>
                .
              </p>
            )}
          </section>
        )}

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
                      <BookCard book={book} showDeleteButton onDelete={removeBook} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <section id="all-documents">
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
                    <BookCard
                      book={book}
                      showDeleteButton
                      onDelete={removeBook}
                      showSubmitButton
                      onSubmitToLibrary={openSubmission}
                    />
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
