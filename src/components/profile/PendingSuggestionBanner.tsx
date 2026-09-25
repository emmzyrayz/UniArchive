// src/components/profile/PendingSuggestionBanner.tsx
// Shows the user's school suggestion while it awaits review, with a
// withdraw action during the 24-hour window.
"use client";

import { useCallback, useEffect, useState } from "react";

export interface PendingSuggestion {
  _id: string;
  status: "pending" | "possible_duplicate" | "linked_duplicate";
  suggestedUniversityName: string;
  suggestedFacultyName: string;
  suggestedDepartmentName: string;
  submittedAt: string;
  canWithdrawUntil: string;
  suggestionScope: "full" | "faculty_department" | "department_only";
}

/** Loads GET /api/institutions/suggest/status; `reload` refetches. */
export function usePendingSuggestion(enabled = true) {
  const [suggestion, setSuggestion] = useState<PendingSuggestion | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/institutions/suggest/status", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestion: PendingSuggestion | null };
        setSuggestion(data.suggestion);
      } catch {
        // Not critical: the banner simply doesn't show
      }
    })();
    return () => controller.abort();
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Once disabled (e.g. the pointer was cleared), don't show a stale result
  return { suggestion: enabled ? suggestion : null, reload };
}

interface Props {
  suggestion: PendingSuggestion;
  /** Called after a successful withdrawal. */
  onWithdrawn?: () => void;
}

export default function PendingSuggestionBanner({ suggestion, onWithdrawn }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evaluated once per render; the window is 24h so staleness doesn't matter
  const [now] = useState(() => Date.now());
  const canWithdraw = now < new Date(suggestion.canWithdrawUntil).getTime();

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setError(null);
    try {
      const res = await fetch(`/api/institutions/suggest/${suggestion._id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Couldn't withdraw the suggestion.");
        return;
      }
      onWithdrawn?.();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setWithdrawing(false);
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
      <p className="font-medium text-amber-800 dark:text-amber-200">School under review</p>
      <p className="text-amber-700 dark:text-amber-300 mt-0.5">
        {suggestion.suggestedUniversityName} — {suggestion.suggestedFacultyName} —{" "}
        {suggestion.suggestedDepartmentName}
      </p>
      {canWithdraw &&
        (confirming ? (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-amber-800 dark:text-amber-200">Withdraw this suggestion?</span>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="font-semibold text-amber-700 dark:text-amber-300 underline disabled:opacity-60"
            >
              {withdrawing ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-amber-600 dark:text-amber-400"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-2 text-xs text-amber-600 dark:text-amber-400 underline"
          >
            Withdraw suggestion
          </button>
        ))}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
