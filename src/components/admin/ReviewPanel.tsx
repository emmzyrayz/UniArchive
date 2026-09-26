// components/admin/ReviewPanel.tsx
// Side drawer with everything a reviewer needs for one submission: the
// metadata, a link to read the PDF, the review notes thread and the actions
// the viewer's role allows.
"use client";

import { useEffect, useState } from "react";
import { FiExternalLink, FiX } from "react-icons/fi";
import { StatusBadge } from "./ReviewModals";
import {
  canEndorse,
  categoryLabel,
  isDecidable,
  timeAgo,
  type AdminSubmissionDto,
  type Viewer,
} from "./reviewShared";

export type PanelAction = "start" | "verify" | "reject" | "endorse";

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm text-text-primary">{value}</dd>
    </div>
  );
}

export function ReviewPanel({
  submission: s,
  viewer,
  busy,
  error,
  onClose,
  onAction,
  onAddNote,
}: {
  submission: AdminSubmissionDto;
  viewer: Viewer;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onAction: (action: PanelAction) => void;
  onAddNote: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const heldByOther =
    s.status === "in_review" && !!s.reviewedBy && s.reviewedBy.id !== viewer.userId;
  const decidable = isDecidable(s.status);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${s.title}`}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-surface-raised shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary break-words">{s.title}</h2>
            <p className="mt-1 text-xs text-text-secondary">
              {categoryLabel(s.category, s.subcategory)} · by {s.submittedBy.name} (
              {s.submittedBy.upid}) · {timeAgo(s.submittedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-text-muted hover:text-text-primary"
          >
            <FiX size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="flex flex-wrap items-center gap-3">
            <StatusBadge submission={s} viewer={viewer} />
            {s.reviewStartedAt && s.status === "in_review" && (
              <span className="text-xs text-text-muted">
                started {timeAgo(s.reviewStartedAt)}
              </span>
            )}
            <a
              href={s.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface"
            >
              Open PDF in reader <FiExternalLink size={14} />
            </a>
          </section>

          {s.status === "rejected" && s.rejectionReason && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-text-primary">
              <span className="font-semibold">Rejection reason:</span> {s.rejectionReason}
            </p>
          )}

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm text-text-primary">{s.description}</p>
          </section>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="University" value={s.universityName} />
            <Field label="Faculty" value={s.facultyName} />
            <Field label="Department" value={s.departmentName} />
            <Field
              label="Course"
              value={[s.courseCode, s.courseName].filter(Boolean).join(" — ") || undefined}
            />
            <Field label="Level" value={s.level && /^\d+$/.test(s.level) ? `${s.level}L` : s.level} />
            <Field label="Semester" value={s.semester} />
            <Field label="Academic year" value={s.academicYear} />
            <Field label="Language" value={s.language} />
          </dl>

          {s.tags.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-secondary border border-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Review notes
            </h3>
            {s.reviewNotes.length === 0 ? (
              <p className="text-sm text-text-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {s.reviewNotes.map((n, i) => (
                  <li key={`${n.createdAt}-${i}`} className="rounded-lg bg-surface p-3">
                    <p className="text-xs text-text-muted">
                      {n.authorUpid} · {n.authorRole.replace("_", " ")} · {timeAgo(n.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{n.note}</p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (note.trim() && (await onAddNote(note.trim()))) setNote("");
              }}
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder="Add a note for other reviewers"
                aria-label="Add note"
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy || !note.trim()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-40"
              >
                Add Note
              </button>
            </form>
          </section>
        </div>

        <footer className="border-t border-border p-5">
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {heldByOther && (
            <p className="mb-3 text-xs text-text-muted">
              {s.reviewedBy?.upid} is reviewing this. You can still decide on it if needed.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {s.status === "submitted" && viewer.canReview && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("start")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Start Review
              </button>
            )}
            {s.status === "in_review" && viewer.canReject && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("reject")}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
              >
                Reject ✗
              </button>
            )}
            {s.status === "in_review" && viewer.canVerifyTier1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("verify")}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
              >
                Verify — Tier 1 ✓
              </button>
            )}
            {canEndorse(s, viewer) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("endorse")}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
              >
                Endorse — Tier 2 ⭐
              </button>
            )}
            {decidable && !viewer.canReview && !viewer.canVerifyTier1 && !viewer.canReject && (
              <p className="text-xs text-text-muted">
                Your role can read submissions and add notes, but not decide on them.
              </p>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
