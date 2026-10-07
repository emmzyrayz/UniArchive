// components/admin/DriveInboxAdmin.tsx
// /admin/materials/drive-inbox: the platform Google Drive inbox. Connect
// UniArchive's Google account (people share PDFs with it), see the last
// check, run "Check now", and the recent imports with who shared them.
// Imported files wait in the upload queue's "Drive inbox" tab.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ActionError,
  AdminPageShell,
  ListState,
  adminRequest,
  cardClass,
  dangerButton,
  primaryButton,
  secondaryButton,
  useAdminList,
} from "./adminUi";
import { timeAgo } from "./reviewShared";

interface CheckSummary {
  at: string;
  found: number;
  imported: number;
  duplicate: number;
  failed: number;
  remaining: number;
  error?: string;
}
interface InboxState {
  configured: boolean;
  expectedEmail: string | null;
  connection: {
    accountEmail: string;
    connectedByUpid: string;
    connectedAt: string;
    status: "ok" | "broken";
    lastError: string | null;
    lastCheck: CheckSummary | null;
    running: boolean;
  } | null;
  recent: {
    id: string;
    name: string;
    status: "imported" | "duplicate" | "failed";
    message: string | null;
    sharedByName: string | null;
    sharedByEmail: string | null;
    bookId: string | null;
    createdAt: string;
  }[];
}

const summaryText = (s: CheckSummary) =>
  s.error
    ? s.error
    : s.found === 0
      ? "Nothing new."
      : `${s.imported} imported, ${s.duplicate} already had, ${s.failed} failed${s.remaining ? `, ${s.remaining} left for the next check` : ""}.`;

export function DriveInboxAdmin() {
  const params = useSearchParams();
  const { data, loading, error, reload } = useAdminList<InboxState>("/api/admin/drive-inbox");
  const [busy, setBusy] = useState<"check" | "disconnect" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const connected = params.get("connected");
  const returnError = params.get("error");
  const conn = data?.connection;

  const checkNow = async () => {
    setBusy("check");
    setActionError(null);
    setResult(null);
    try {
      const summary = await adminRequest<CheckSummary>("/api/admin/drive-inbox/check", "POST", {});
      setResult(summaryText(summary));
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "The check failed.");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect the Drive inbox? Nothing new is imported until it's connected again.")) return;
    setBusy("disconnect");
    setActionError(null);
    try {
      await adminRequest("/api/admin/drive-inbox", "DELETE");
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't disconnect.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPageShell
      title="Google Drive inbox"
      subtitle="People who'd rather not join can share PDFs or folders with UniArchive's Google account. A daily check imports new PDFs into the upload queue (Drive inbox tab), noting who shared them."
      loading={loading}
      onRefresh={reload}
      actions={
        <Link href="/admin/materials/queue" className={secondaryButton}>
          Open queue
        </Link>
      }
    >
      {connected && (
        <p role="status" className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Connected {connected}. Run &ldquo;Check now&rdquo; to import what&apos;s already shared with it.
        </p>
      )}
      {returnError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {returnError}
        </p>
      )}
      <ActionError message={actionError} />

      <ListState loading={loading && !data} error={error} empty={false} emptyText="">
        {data && (
          <div className="space-y-5">
            <section className={cardClass}>
              {!data.configured ? (
                <p className="text-sm text-text-secondary">
                  Not set up: add DRIVE_INBOX_CLIENT_ID and DRIVE_INBOX_CLIENT_SECRET (a Google OAuth client with the
                  Drive read-only scope) and PLATFORM_DRIVE_EMAIL to the environment.
                </p>
              ) : !conn ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-secondary">
                    Not connected. Sign in as {data.expectedEmail ?? "UniArchive's Google account"} and allow read-only
                    access to its Drive.
                  </p>
                  <a href="/api/admin/drive-inbox/connect" className={primaryButton}>
                    Connect Google account
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-text-primary">{conn.accountEmail}</p>
                      <p className="text-xs text-text-muted">
                        Connected by @{conn.connectedByUpid} {timeAgo(conn.connectedAt)} ·{" "}
                        {conn.status === "ok" ? "working" : "needs reconnecting"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={primaryButton} disabled={busy !== null || conn.running || conn.status !== "ok"} onClick={checkNow}>
                        {busy === "check" || conn.running ? "Checking…" : "Check now"}
                      </button>
                      <a href="/api/admin/drive-inbox/connect" className={secondaryButton}>
                        Reconnect
                      </a>
                      <button type="button" className={dangerButton} disabled={busy !== null} onClick={disconnect}>
                        Disconnect
                      </button>
                    </div>
                  </div>
                  {conn.status === "broken" && conn.lastError && (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{conn.lastError}</p>
                  )}
                  {result && (
                    <p role="status" className="text-sm text-text-primary">
                      {result}
                    </p>
                  )}
                  {conn.lastCheck && (
                    <p className="text-sm text-text-secondary">
                      Last check {timeAgo(conn.lastCheck.at)}: {summaryText(conn.lastCheck)}
                    </p>
                  )}
                  <p className="text-xs text-text-muted">
                    Checked daily. A check runs for up to 4 minutes; anything left over is picked up next time. A file
                    that fails three times isn&apos;t tried again.
                  </p>
                </div>
              )}
            </section>

            <section className={cardClass}>
              <h2 className="mb-3 font-semibold text-text-primary">Recent imports</h2>
              {data.recent.length === 0 ? (
                <p className="text-sm text-text-muted">Nothing imported from the inbox yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm text-text-primary">{r.name}</p>
                        <p className="text-xs text-text-muted">
                          {r.sharedByName || r.sharedByEmail
                            ? `Shared by ${[r.sharedByName, r.sharedByEmail && `<${r.sharedByEmail}>`].filter(Boolean).join(" ")}`
                            : "Sharer unknown"}{" "}
                          · {timeAgo(r.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          r.status === "imported" ? "text-green-600" : r.status === "failed" ? "text-red-500" : "text-amber-600"
                        }`}
                        title={r.message ?? undefined}
                      >
                        {r.status === "imported" ? "Imported" : r.status === "duplicate" ? "Already had it" : `Failed: ${r.message ?? ""}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </ListState>
    </AdminPageShell>
  );
}
