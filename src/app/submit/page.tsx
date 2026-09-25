// src/app/submit/page.tsx
// Submit a document from the user's library to the UniLibrary: /submit?bookId=
// Gates, in order: signed in (proxy + client check), 100% profile, the book
// exists and is theirs, it has a description. A submission already under
// review or published shows its status instead of the form.
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCheckCircle, FiClock } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { CompletionBar, PROFILE_CARD_CLASS } from "@/components/profile/profileUi";
import { FIELD_CLASS } from "@/components/profile/UniversityCombobox";
import SubmissionForm, {
  initialFormState,
  type SubmissionRecord,
} from "@/components/submit/SubmissionForm";
import type { Book } from "@/types/library";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; book: Book; submission: SubmissionRecord | null };

function GateCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${PROFILE_CARD_CLASS} p-8 text-center max-w-lg mx-auto`}>
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
      <div className="mt-3 text-sm text-text-secondary space-y-4">{children}</div>
    </div>
  );
}

const primaryBtn =
  "inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const secondaryBtn =
  "inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700";

/** "Add a description first", with an inline editor so the user isn't stuck. */
function DescriptionGate({ book, onSaved }: { book: Book; onSaved: (description: string) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!description.trim()) {
      setError("Write a short description first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onSaved(description.trim());
    } catch {
      setError("Couldn't save the description. Try again.");
      setSaving(false);
    }
  };

  return (
    <GateCard title="Add a description first">
      <p>
        &ldquo;{book.title}&rdquo; doesn&apos;t have a description. A description helps reviewers
        understand what this document covers.
      </p>
      {editing ? (
        <div className="text-left space-y-2">
          <textarea
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this document cover?"
            className={`${FIELD_CLASS} border-neutral-200 dark:border-neutral-600 resize-y`}
            autoFocus
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className={secondaryBtn}>
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
              {saving ? "Saving…" : "Save description"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className={primaryBtn}>
            Edit Book
          </button>
          <button type="button" onClick={() => router.back()} className={secondaryBtn}>
            Go Back
          </button>
        </div>
      )}
    </GateCard>
  );
}

function SubmissionStatusView({ submission }: { submission: SubmissionRecord }) {
  const published = submission.status === "verified";
  const since = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  return (
    <GateCard title={published ? "Published in the UniLibrary" : "Under review"}>
      <div className="flex justify-center">
        {published ? (
          <FiCheckCircle size={36} className="text-green-500" />
        ) : (
          <FiClock size={36} className="text-amber-500" />
        )}
      </div>
      <p className="font-medium text-text-primary">{submission.title}</p>
      <p>
        {published
          ? "This document has been verified and is available in the UniLibrary."
          : `Submitted${since ? ` on ${since}` : ""}. You'll be notified when it's approved or if changes are needed.`}
      </p>
      <p className="text-xs text-text-muted">
        {[submission.universityName, submission.facultyName, submission.departmentName]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <Link href="/home" className={secondaryBtn}>
        Back to library
      </Link>
    </GateCard>
  );
}

function SubmitFlow() {
  const router = useRouter();
  const bookId = useSearchParams().get("bookId") ?? "";
  const { hasActiveSession, isLoading, profileCompletion, userProfile } = useUser();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.replace(`/auth?view=signin&from=${encodeURIComponent(`/submit?bookId=${bookId}`)}`);
    }
  }, [isLoading, hasActiveSession, router, bookId]);

  const profileComplete = !profileCompletion || profileCompletion.percentage >= 100;
  const validBookId = /^[a-f0-9]{24}$/i.test(bookId);

  // Load the book and, if it has one, its submission
  useEffect(() => {
    if (!hasActiveSession || !profileComplete || !validBookId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const bookRes = await fetch(`/api/books/${bookId}?meta=1`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (bookRes.status === 404) {
          setState({ status: "error", message: "That document isn't in your library." });
          return;
        }
        if (!bookRes.ok) throw new Error(String(bookRes.status));
        const { book } = (await bookRes.json()) as { book: Book };

        let submission: SubmissionRecord | null = null;
        if (book.submissionId) {
          const subRes = await fetch(`/api/submissions/${book.submissionId}`, {
            credentials: "same-origin",
            signal: controller.signal,
          });
          if (subRes.ok) {
            submission = ((await subRes.json()) as { submission: SubmissionRecord }).submission;
          }
        }
        setState({ status: "ready", book, submission });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState({ status: "error", message: "Couldn't load the document. Check your connection." });
      }
    })();
    return () => controller.abort();
  }, [hasActiveSession, profileComplete, validBookId, bookId]);

  if (isLoading || !hasActiveSession) return null;

  if (!profileComplete && profileCompletion) {
    return (
      <GateCard title="Complete your profile first">
        <p>You need a 100% complete profile to submit materials to the UniLibrary.</p>
        <p>
          Your profile is currently{" "}
          <span className="font-semibold text-text-primary">{profileCompletion.percentage}%</span>{" "}
          complete.
        </p>
        <CompletionBar percentage={profileCompletion.percentage} />
        <Link href="/profile/edit" className={primaryBtn}>
          Complete Profile
        </Link>
      </GateCard>
    );
  }

  if (!validBookId) {
    return (
      <GateCard title="No document selected">
        <p>Choose a document from your library and use &ldquo;Submit to UniLibrary&rdquo;.</p>
        <Link href="/home" className={secondaryBtn}>
          Back to library
        </Link>
      </GateCard>
    );
  }
  if (state.status === "loading") {
    return <p className="text-center text-sm text-text-muted">Loading…</p>;
  }
  if (state.status === "error") {
    return (
      <GateCard title="Can't submit this document">
        <p>{state.message}</p>
        <Link href="/home" className={secondaryBtn}>
          Back to library
        </Link>
      </GateCard>
    );
  }

  const { book, submission } = state;
  if (submission && !["draft", "rejected"].includes(submission.status)) {
    return <SubmissionStatusView submission={submission} />;
  }
  if (!book.description?.trim()) {
    return (
      <DescriptionGate
        book={book}
        onSaved={(description) =>
          setState({ status: "ready", book: { ...book, description }, submission })
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Submit to UniLibrary</h1>
        <p className="text-sm text-text-secondary mt-1">
          Share &ldquo;{book.title}&rdquo; with students at your university. A reviewer checks every
          submission before it&apos;s published.
        </p>
      </div>
      <SubmissionForm
        book={book}
        existing={submission}
        initial={initialFormState(book, submission, userProfile)}
      />
    </div>
  );
}

export default function SubmitPage() {
  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* useSearchParams needs a Suspense boundary for static rendering */}
        <Suspense fallback={<p className="text-center text-sm text-text-muted">Loading…</p>}>
          <SubmitFlow />
        </Suspense>
      </div>
    </div>
  );
}
