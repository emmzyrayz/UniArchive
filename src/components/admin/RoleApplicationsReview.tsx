// components/admin/RoleApplicationsReview.tsx
// The /admin/role-applications queue: status tabs, application cards with the
// eligibility the applicant had when applying, and approve / reject dialogs.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import { ROLE_LABELS } from "@/components/profile/profileUi";
import { Modal, ModalActions, fieldClass } from "./ReviewModals";
import { reviewRequest, timeAgo } from "./reviewShared";
import type {
  AdminRoleApplicationDto,
  RoleApplicationStatus,
} from "@/types/roleProgression";
import type { UserRole } from "@/types/roles";

type Counts = Record<RoleApplicationStatus, number>;

interface ListResponse {
  applications: AdminRoleApplicationDto[];
  total: number;
  page: number;
  totalPages: number;
  counts: Counts;
}

type Loaded = { key: string; data: ListResponse } | { key: string; error: string };
type Dialog = { kind: "approve" | "reject"; id: string } | null;

const TABS: { status: RoleApplicationStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
  { status: "withdrawn", label: "Withdrawn" },
];

const PAGE_SIZE = 20;
const NOTE_MAX_LENGTH = 1000;

const roleLabel = (role: string) => ROLE_LABELS[role as UserRole] ?? role;

function Check({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${
        met ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      <span aria-hidden>{met ? "✓" : "✗"}</span>
      {children}
    </span>
  );
}

function SnapshotLine({ a }: { a: AdminRoleApplicationDto }) {
  const s = a.eligibilitySnapshot;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <Check met>{s.verifiedMaterialCount} verified materials</Check>
      {a.targetRole === "collaborator" ? (
        <>
          <Check met>{s.accountAgeDays} days old</Check>
          <Check met={s.hasPhone}>Phone</Check>
        </>
      ) : (
        <>
          <Check met>{s.monthsAsCollaborator ?? 0} months as Collaborator</Check>
          <Check met={s.profileCompletionPercent >= 100}>
            {s.profileCompletionPercent}% profile
          </Check>
        </>
      )}
      <Check met={s.violationCount === 0}>
        {s.violationCount === 0 ? "No violations" : `${s.violationCount} violations`}
      </Check>
    </div>
  );
}

export function RoleApplicationsReview({
  initialCounts,
  viewer,
}: {
  initialCounts: Counts;
  viewer: { userId: string; canDecide: boolean };
}) {
  const [status, setStatus] = useState<RoleApplicationStatus>("pending");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [counts, setCounts] = useState<Counts>(initialCounts);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const query = new URLSearchParams({ status, page: String(page), limit: String(PAGE_SIZE) }).toString();
  const requestKey = `${query}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/role-applications?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        return data as ListResponse;
      })
      .then((data) => {
        setLoaded({ key: requestKey, data });
        setCounts(data.counts);
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setLoaded({ key: requestKey, error: error.message || "Could not load applications." });
      });
    return () => controller.abort();
  }, [query, requestKey]);

  const isLoading = loaded?.key !== requestKey;
  const data = loaded && "data" in loaded ? loaded.data : null;
  const listError = loaded && "error" in loaded ? loaded.error : null;
  const rows = data?.applications ?? [];
  const target = dialog ? (rows.find((r) => r.id === dialog.id) ?? null) : null;

  const closeDialog = () => {
    // A failed decision may still have changed the queue (e.g. an
    // auto-withdraw because the applicant's role changed), so refetch
    if (dialogError) setReloadKey((k) => k + 1);
    setDialog(null);
    setNote("");
    setDialogError(null);
  };

  const decide = async (e: FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    setBusy(true);
    setDialogError(null);
    try {
      await reviewRequest(
        `/api/admin/role-applications/${dialog.id}/${dialog.kind}`,
        "PATCH",
        dialog.kind === "reject" ? { reviewNote: note.trim() } : {},
      );
      closeDialog();
      // Moves between tabs, so refetch the list and counts
      setReloadKey((k) => k + 1);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <FiArrowLeft aria-hidden /> Dashboard
        </Link>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Role applications</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Students applying for Collaborator and Collaborators applying for Auditor.
              {!viewer.canDecide && " You can view this queue; a user admin decides."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg border border-border p-2 text-text-secondary hover:text-text-primary"
            aria-label="Refresh"
          >
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} aria-hidden />
          </button>
        </div>

        <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={status === tab.status}
              onClick={() => {
                setStatus(tab.status);
                setPage(1);
              }}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                status === tab.status
                  ? "border-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label} ({counts[tab.status] ?? 0})
            </button>
          ))}
        </div>

        {listError ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-red-600 dark:text-red-400">
            {listError}
          </p>
        ) : isLoading && !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface-raised" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
            No {status} applications.
          </p>
        ) : (
          <ul className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
            {rows.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      @{a.applicant.upid} · {a.applicant.name}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {roleLabel(a.currentRole)} → <strong>{roleLabel(a.targetRole)}</strong>
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">Applied {timeAgo(a.appliedAt)}</p>
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                    Eligibility at application
                  </p>
                  <SnapshotLine a={a} />
                  {a.status === "pending" &&
                    a.applicant.roleNow &&
                    a.applicant.roleNow !== a.currentRole && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                        Their role is now {roleLabel(a.applicant.roleNow)}; approving will withdraw
                        this application instead.
                      </p>
                    )}
                </div>

                {a.supportingNote && (
                  <p className="mt-3 whitespace-pre-line border-l-2 border-border pl-3 text-sm text-text-secondary">
                    &ldquo;{a.supportingNote}&rdquo;
                  </p>
                )}

                {a.status !== "pending" && (
                  <p className="mt-3 text-xs text-text-muted">
                    {a.status === "withdrawn"
                      ? (a.autoWithdrawnReason ?? "Withdrawn by the applicant.")
                      : `${a.status === "approved" ? "Approved" : "Rejected"} ${timeAgo(a.reviewedAt)}${
                          a.reviewedByUpid ? ` by @${a.reviewedByUpid}` : ""
                        }`}
                    {a.reviewNote && <> · &ldquo;{a.reviewNote}&rdquo;</>}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {/* Public profiles aren't built yet; the link is ready for them */}
                  <Link
                    href={`/profile/${encodeURIComponent(a.applicant.upid)}`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
                  >
                    View profile
                  </Link>
                  {a.status === "pending" && viewer.canDecide && a.applicant.id !== viewer.userId && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "reject", id: a.id })}
                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "approve", id: a.id })}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-text-muted">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {dialog && target && (
        <Modal
          title={dialog.kind === "approve" ? "Approve application" : "Reject application"}
          onClose={closeDialog}
        >
          <form onSubmit={decide}>
            {dialog.kind === "approve" ? (
              <p className="text-sm text-text-secondary">
                Promote <strong>@{target.applicant.upid}</strong> from{" "}
                {roleLabel(target.currentRole)} to <strong>{roleLabel(target.targetRole)}</strong>?
                The new role applies on their next request, and they&apos;ll get an email.
              </p>
            ) : (
              <label className="block text-sm text-text-secondary">
                Reason (shown to <strong>@{target.applicant.upid}</strong>)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={NOTE_MAX_LENGTH}
                  rows={4}
                  required
                  placeholder="What should they address before applying again?"
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
            )}
            <ModalActions
              onCancel={closeDialog}
              confirmLabel={dialog.kind === "approve" ? "Approve" : "Reject"}
              confirmClass={
                dialog.kind === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled={dialog.kind === "reject" && !note.trim()}
              busy={busy}
              error={dialogError}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
