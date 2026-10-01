// components/library/GiftDialog.tsx
// "Gift to UniArchive": the quick alternative to the UniLibrary submission
// form. The student says what the PDF is; their school and level come from
// their profile; staff fill in the rest and publish it as UniArchive's. No
// credit goes to the student (that's what submitting is for).
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { FiGift, FiX } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import type { Book } from "@/types/library";

const NOTE_MIN = 10;
const NOTE_MAX = 1000;

interface Props {
  book: Book;
  onClose: () => void;
  onGifted: (bookId: string, giftedAt: string) => void;
}

export function GiftDialog({ book, onClose, onGifted }: Props) {
  const { userProfile } = useUser();
  const titleId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    noteRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const academic: [string, string | undefined][] = [
    ["University", userProfile?.universityName],
    ["Faculty", userProfile?.facultyName],
    ["Department", userProfile?.departmentName],
    ["Level", userProfile?.level],
  ];
  const noteLength = note.trim().length;
  const canSend = noteLength >= NOTE_MIN && noteLength <= NOTE_MAX && consent && !busy;

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}/gift`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), consent }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; giftedAt?: string };
      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      onGifted(book.id, data.giftedAt ?? new Date().toISOString());
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <FiGift aria-hidden className="text-primary" /> Gift to UniArchive
          </h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded p-1 text-text-muted hover:text-text-primary">
            <FiX aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              Thank you! Our team will add the details and publish <span className="font-medium">{book.title}</span>{" "}
              in the UniLibrary. Your own copy stays in your library.
            </p>
            <button type="button" onClick={onClose} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Skip the UniLibrary form: tell us what <span className="font-medium text-text-primary">{book.title}</span>{" "}
              is and our team does the rest. It&apos;s published as UniArchive&apos;s, so it won&apos;t count toward
              your badges or contributions. Want the credit? Use <span className="font-medium">Submit to UniLibrary</span>{" "}
              instead.
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={`${titleId}-note`} className="text-sm font-medium text-text-secondary">
                  What is this PDF about?
                </label>
                <span className={`text-xs ${noteLength > NOTE_MAX ? "text-error" : "text-text-muted"}`}>
                  {noteLength}/{NOTE_MAX}
                </span>
              </div>
              <textarea
                ref={noteRef}
                id={`${titleId}-note`}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. MTH101 past questions from 2019 to 2023, first semester, with some solutions"
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {noteLength > 0 && noteLength < NOTE_MIN && (
                <p className="text-xs text-text-muted">A few more words, please (at least {NOTE_MIN} characters).</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">From your profile</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {academic.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="text-text-primary">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {!userProfile?.universityName && (
                <p className="mt-2 text-xs text-text-secondary">
                  Adding your school helps us file this correctly.{" "}
                  <Link href="/profile/edit" className="text-primary hover:underline">
                    Complete your profile
                  </Link>
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                I have the right to share this PDF and I&apos;m giving it to UniArchive. It will be published as
                UniArchive&apos;s, without credit to me.
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Gift PDF"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
