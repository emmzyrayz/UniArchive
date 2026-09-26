// components/admin/ReviewModals.tsx
// Status badge plus the verify / endorse / reject dialogs.
"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import type { AdminSubmissionDto, Viewer } from "./reviewShared";

export function StatusBadge({
  submission,
  viewer,
}: {
  submission: AdminSubmissionDto;
  viewer: Viewer;
}) {
  const s = submission;
  const styles: Record<AdminSubmissionDto["status"], string> = {
    draft: "bg-neutral-500/10 text-text-secondary",
    submitted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    in_review: "bg-primary/10 text-primary",
    verified: "bg-green-500/10 text-green-700 dark:text-green-400",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  let label: string;
  switch (s.status) {
    case "in_review":
      label = `In Review · ${s.reviewedBy?.id === viewer.userId ? "You" : (s.reviewedBy?.upid ?? "—")}`;
      break;
    case "verified":
      label = s.verificationTier === "tier2" ? "Endorsed ⭐" : "Verified ✓";
      break;
    case "rejected":
      label = "Rejected ✗";
      break;
    case "submitted":
      label = "Submitted";
      break;
    default:
      label = "Draft";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${styles[s.status]}`}
    >
      {label}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary"
          >
            <FiX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40";

function ModalActions({
  onCancel,
  confirmLabel,
  confirmClass,
  disabled,
  busy,
  error,
}: {
  onCancel: () => void;
  confirmLabel: string;
  confirmClass: string;
  disabled: boolean;
  busy: boolean;
  error?: string | null;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled || busy}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${confirmClass}`}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </>
  );
}

const TIER1_CHECKS = [
  "Real and not fabricated",
  "Relevant to the stated course",
  "Not plagiarised or harmful",
];
const TIER2_CHECKS = ["Academically accurate and suitable for students"];

/** Verify (tier 1) or endorse (tier 2). The checkboxes are a UI gate only. */
export function VerifyModal({
  tier,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  tier: 1 | 2;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const checks = tier === 1 ? TIER1_CHECKS : TIER2_CHECKS;
  const [ticked, setTicked] = useState<boolean[]>(() => checks.map(() => false));
  const [note, setNote] = useState("");
  const allTicked = ticked.every(Boolean);

  return (
    <Modal title={tier === 1 ? "Verify this material" : "Endorse this material"} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (allTicked) onConfirm(note.trim());
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">
            I confirm this document is:
          </legend>
          <div className="space-y-2">
            {checks.map((label, i) => (
              <label key={label} className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={ticked[i]}
                  onChange={(e) =>
                    setTicked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                  className="h-4 w-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block text-sm font-medium text-text-primary">
          Note to submitter <span className="font-normal text-text-muted">(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            className={`${fieldClass} mt-1.5`}
          />
        </label>

        <ModalActions
          onCancel={onCancel}
          confirmLabel={tier === 1 ? "Verify — Tier 1 ✓" : "Endorse — Tier 2 ⭐"}
          confirmClass={tier === 1 ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"}
          disabled={!allTicked}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

export function RejectModal({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <Modal title="Reject submission" onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onConfirm(reason.trim(), note.trim());
        }}
      >
        <label className="block text-sm font-medium text-text-primary">
          Reason <span className="font-normal text-text-muted">(shown to submitter)</span>{" "}
          <span className="text-red-600">*</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            required
            className={`${fieldClass} mt-1.5`}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-text-primary">
          Internal note <span className="font-normal text-text-muted">(not shown)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            className={`${fieldClass} mt-1.5`}
          />
        </label>
        <ModalActions
          onCancel={onCancel}
          confirmLabel="Reject ✗"
          confirmClass="bg-red-600 hover:bg-red-700"
          disabled={!reason.trim()}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}
