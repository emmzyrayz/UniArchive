// components/admin/broadcasts/SendPanels.tsx
// The Review step's lower half. SendPanel (drafts): send now or schedule,
// confirming the live recipient count. StatusPanel (everything else):
// status, Brevo's numbers, cancel a scheduled one, duplicate.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminAudiencePreview, AdminBroadcastDto } from "@/types/admin";
import { Modal, ModalActions } from "../ReviewModals";
import { timeAgo } from "../reviewShared";
import { adminRequest, cardClass, dangerButton, inputClass, primaryButton, secondaryButton } from "../adminUi";

const SCHEDULE_MIN_MINUTES = 10;

/** "2026-10-12T21:30" (local) for <input type="datetime-local"> */
function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className={secondaryButton}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { broadcast } = await adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${id}/duplicate`, "POST", {});
            router.push(`/admin/mail/broadcasts/${broadcast.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't duplicate it.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Copying..." : "Duplicate as new draft"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}

export function SendPanel({
  broadcast,
  ready,
  ensureSaved,
  onSent,
}: {
  broadcast: AdminBroadcastDto;
  /** No content or audience problems */
  ready: boolean;
  /** Saves pending edits; false if that failed */
  ensureSaved: () => Promise<boolean>;
  onSent: (b: AdminBroadcastDto) => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(() => localInputValue(new Date(Date.now() + 60 * 60 * 1000)));

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State is only set once the request settles (never synchronously in the effect)
  const loadCount = useCallback(
    () =>
      adminRequest<AdminAudiencePreview>("/api/admin/broadcasts/audience", "POST", {
        audience: broadcast.audience,
        kind: broadcast.kind,
      }).then(
        (data) => {
          setCount(data.total);
          setCountError(null);
        },
        (err: unknown) => setCountError(err instanceof Error ? err.message : "Couldn't count recipients."),
      ),
    [broadcast.audience, broadcast.kind],
  );

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // The earliest allowed time is checked against when the panel opened (the
  // server checks again against the real clock)
  const [openedAt] = useState(() => Date.now());
  const scheduledAt = mode === "schedule" ? new Date(when) : null;
  const scheduleProblem =
    scheduledAt && (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < openedAt + SCHEDULE_MIN_MINUTES * 60_000)
      ? `Pick a time at least ${SCHEDULE_MIN_MINUTES} minutes from now.`
      : null;
  const untested = !broadcast.lastTestAt || new Date(broadcast.lastTestAt) < new Date(broadcast.updatedAt);

  const send = async () => {
    if (count === null) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await ensureSaved())) {
        setError("Save your changes first.");
        return;
      }
      const res = await fetch(`/api/admin/broadcasts/${broadcast.id}/send`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCount: count, ...(scheduledAt && { scheduledAt: scheduledAt.toISOString() }) }),
      });
      const data = (await res.json().catch(() => null)) as { broadcast?: AdminBroadcastDto; message?: string; total?: number } | null;
      if (res.ok && data?.broadcast) {
        setConfirming(false);
        onSent(data.broadcast);
        return;
      }
      if (res.status === 409 && typeof data?.total === "number") setCount(data.total);
      setError(data?.message ?? `Couldn't send (HTTP ${res.status}).`);
    } catch {
      setError("Network error. Check the broadcast's status before trying again.");
    } finally {
      setBusy(false);
    }
  };

  const label =
    count === null ? "Counting..." : `${mode === "now" ? "Send" : "Schedule"} to ${count.toLocaleString()} ${count === 1 ? "person" : "people"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm text-text-primary">
        <label className="flex items-center gap-2">
          <input type="radio" name="when" checked={mode === "now"} onChange={() => setMode("now")} /> Send now
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="when" checked={mode === "schedule"} onChange={() => setMode("schedule")} /> Schedule
        </label>
      </div>
      {mode === "schedule" && (
        <label className="block text-xs text-text-muted">
          Send at (your local time)
          <input type="datetime-local" className={`mt-1 ${inputClass}`} value={when} onChange={(e) => setWhen(e.target.value)} />
          {scheduleProblem && <span className="mt-1 block text-red-600 dark:text-red-400">{scheduleProblem}</span>}
        </label>
      )}
      {countError && <p className="text-sm text-red-600 dark:text-red-400">{countError}</p>}
      {untested && ready && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
          You haven&apos;t sent yourself a test since the last change.
        </p>
      )}
      <button
        type="button"
        className={primaryButton}
        disabled={!ready || count === null || count === 0 || !!scheduleProblem || busy}
        onClick={() => {
          setError(null);
          setConfirming(true);
          loadCount();
        }}
      >
        {count === 0 ? "Nobody matches the audience" : label}
      </button>

      {confirming && (
        <Modal title={mode === "now" ? "Send this broadcast?" : "Schedule this broadcast?"} onClose={() => !busy && setConfirming(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="space-y-2 text-sm text-text-secondary"
          >
            <p>
              <strong className="text-text-primary">{broadcast.subject}</strong>
            </p>
            <p>
              To <strong className="text-text-primary">{count?.toLocaleString() ?? "..."}</strong>{" "}
              {broadcast.kind === "newsletter" ? "newsletter subscribers" : "people who get announcements"},{" "}
              {scheduledAt ? `on ${scheduledAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : "right now"}, from
              updates@uniarchive.com.ng through Brevo.
            </p>
            <p>{mode === "now" ? "It can't be unsent." : "You can cancel it until shortly before then."}</p>
            <ModalActions
              onCancel={() => setConfirming(false)}
              confirmLabel={mode === "now" ? "Send now" : "Schedule"}
              confirmClass="bg-primary hover:bg-primary/90"
              disabled={count === null}
              busy={busy}
              error={error}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, of }: { label: string; value: number; of?: number }) {
  const pct = of ? Math.round((value / of) * 100) : null;
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-bold text-text-primary">
        {value.toLocaleString()}
        {pct !== null && <span className="ml-1 text-xs font-normal text-text-muted">{pct}%</span>}
      </p>
    </div>
  );
}

export function StatusPanel({ broadcast, onChange }: { broadcast: AdminBroadcastDto; onChange: (b: AdminBroadcastDto) => void }) {
  const [busy, setBusy] = useState<"stats" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const hasCampaign = broadcast.status === "sent" || broadcast.status === "scheduled" || broadcast.status === "failed";

  const refresh = useCallback(
    async (force: boolean) => {
      setBusy("stats");
      setError(null);
      try {
        const { broadcast: b } = await adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${broadcast.id}/stats`, "POST", { force });
        onChange(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load Brevo's numbers.");
      } finally {
        setBusy(null);
      }
    },
    [broadcast.id, onChange],
  );

  // Fresh-enough numbers on open (the server caches them for 5 minutes).
  // Quiet: no busy state, and errors only show if the admin refreshes.
  useEffect(() => {
    if (!hasCampaign) return;
    let live = true;
    adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${broadcast.id}/stats`, "POST", { force: false })
      .then(({ broadcast: b }) => live && onChange(b))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [broadcast.id, hasCampaign, onChange]);

  const cancel = async () => {
    setBusy("cancel");
    setError(null);
    try {
      const { broadcast: b } = await adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${broadcast.id}/cancel`, "POST", {});
      onChange(b);
      setConfirmCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel it.");
    } finally {
      setBusy(null);
    }
  };

  const s = broadcast.stats;
  return (
    <div className={`${cardClass} space-y-3 text-sm`}>
      <h2 className="font-semibold text-text-primary">
        {broadcast.status === "scheduled"
          ? "Scheduled"
          : broadcast.status === "sent"
            ? "Sent"
            : broadcast.status === "sending"
              ? "Sending"
              : broadcast.status === "failed"
                ? "Failed"
                : "Cancelled"}
      </h2>
      <p className="text-text-secondary">
        {broadcast.recipientCount !== undefined && `${broadcast.recipientCount.toLocaleString()} recipients. `}
        {broadcast.status === "scheduled" && broadcast.scheduledAt && `Goes out ${formatWhen(broadcast.scheduledAt)}. `}
        {broadcast.sentAt && `Sent ${formatWhen(broadcast.sentAt)}. `}
      </p>
      {broadcast.error && <p className="text-red-600 dark:text-red-400">{broadcast.error}</p>}

      {hasCampaign && (
        <>
          {s ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Delivered" value={s.delivered} />
              <Stat label="Opened" value={s.opened} of={s.delivered || undefined} />
              <Stat label="Clicked" value={s.clicked} of={s.delivered || undefined} />
              <Stat label="Unsubscribed" value={s.unsubscribed} />
              <Stat label="Bounced" value={s.bounced} />
            </div>
          ) : (
            <p className="text-text-muted">No numbers from Brevo yet.</p>
          )}
          <p className="text-xs text-text-muted">
            {s && `Updated ${timeAgo(s.updatedAt)}. `}Opens are approximate: some email apps block tracking.
          </p>
        </>
      )}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {hasCampaign && (
          <button type="button" className={secondaryButton} disabled={busy !== null} onClick={() => refresh(true)}>
            {busy === "stats" ? "Refreshing..." : "Refresh numbers"}
          </button>
        )}
        {broadcast.status === "scheduled" && (
          <button type="button" className={dangerButton} disabled={busy !== null} onClick={() => setConfirmCancel(true)}>
            Cancel the send
          </button>
        )}
        <DuplicateButton id={broadcast.id} />
      </div>

      {confirmCancel && (
        <Modal title="Cancel this scheduled broadcast?" onClose={() => busy === null && setConfirmCancel(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              cancel();
            }}
            className="text-sm text-text-secondary"
          >
            <p>It won&apos;t be sent. To send it later, duplicate it as a new draft.</p>
            <ModalActions
              onCancel={() => setConfirmCancel(false)}
              confirmLabel="Cancel the send"
              confirmClass="bg-red-600 hover:bg-red-700"
              disabled={false}
              busy={busy === "cancel"}
              error={error}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
