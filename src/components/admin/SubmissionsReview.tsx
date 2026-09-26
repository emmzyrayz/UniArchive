// components/admin/SubmissionsReview.tsx
// The /admin/submissions queue: status tabs, filters, the submissions table
// with inline quick-reject, and the review drawer + decision modals.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import { ReviewPanel, type PanelAction } from "./ReviewPanel";
import { RejectModal, StatusBadge, VerifyModal } from "./ReviewModals";
import {
  REVIEW_TABS,
  categoryLabel,
  isDecidable,
  reviewRequest,
  timeAgo,
  type AdminSubmissionDto,
  type ReviewStatus,
  type Viewer,
} from "./reviewShared";

export interface UniversityOption {
  id: string;
  name: string;
  abbr?: string;
}

type Counts = Record<ReviewStatus, number>;
type Sort = "oldest" | "newest";

interface ListResponse {
  submissions: AdminSubmissionDto[];
  total: number;
  page: number;
  totalPages: number;
  counts: Counts;
}

type Loaded = { key: string; data: ListResponse } | { key: string; error: string };

type Dialog = { kind: "verify" | "endorse" | "reject"; id: string } | null;

const PAGE_SIZE = 20;

const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40";

export function SubmissionsReview({
  initialCounts,
  universities,
  viewer,
}: {
  initialCounts: Counts;
  universities: UniversityOption[];
  viewer: Viewer;
}) {
  const [status, setStatus] = useState<ReviewStatus>("submitted");
  const [category, setCategory] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [sort, setSort] = useState<Sort>("oldest");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [counts, setCounts] = useState<Counts>(initialCounts);

  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [quickReject, setQuickReject] = useState<{ id: string; reason: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = new URLSearchParams({ status, sort, page: String(page), limit: String(PAGE_SIZE) });
  if (category) params.set("category", category);
  if (universityId) params.set("universityId", universityId);
  const query = params.toString();
  const requestKey = `${query}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/submissions?${query}`, { signal: controller.signal, cache: "no-store" })
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
        setLoaded({ key: requestKey, error: error.message || "Could not load submissions." });
      });
    return () => controller.abort();
  }, [query, requestKey]);

  const isLoading = loaded?.key !== requestKey;
  const data = loaded && "data" in loaded ? loaded.data : null;
  const listError = loaded && "error" in loaded ? loaded.error : null;
  const rows = data?.submissions ?? [];
  const openSubmission = rows.find((r) => r.id === openId) ?? null;
  const dialogSubmission = dialog ? rows.find((r) => r.id === dialog.id) ?? null : null;

  // Any filter change goes back to page 1
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  /** Swaps an updated submission into the table and moves the tab counts. */
  const applyUpdate = (updated: AdminSubmissionDto) => {
    const before = rows.find((s) => s.id === updated.id);
    if (before && before.status !== updated.status) {
      setCounts((c) => {
        const next = { ...c };
        if (before.status in next) next[before.status as ReviewStatus] -= 1;
        if (updated.status in next) next[updated.status as ReviewStatus] += 1;
        return next;
      });
    }
    setLoaded((prev) =>
      prev && "data" in prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              submissions: prev.data.submissions.map((s) => (s.id === updated.id ? updated : s)),
            },
          }
        : prev,
    );
  };

  const run = async (id: string, request: () => Promise<{ submission: AdminSubmissionDto }>) => {
    setBusyId(id);
    setActionError(null);
    try {
      const { submission } = await request();
      applyUpdate(submission);
      return true;
    } catch (error) {
      setActionError((error as Error).message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const base = (id: string) => `/api/admin/submissions/${encodeURIComponent(id)}`;

  const startReview = (id: string) =>
    run(id, () => reviewRequest(`${base(id)}/start-review`, "PATCH", {}));

  const verify = async (id: string, tier: 1 | 2, note: string) => {
    if (await run(id, () => reviewRequest(`${base(id)}/verify`, "PATCH", { tier, note: note || undefined }))) {
      setDialog(null);
    }
  };

  const reject = async (id: string, reason: string, note?: string) => {
    if (await run(id, () => reviewRequest(`${base(id)}/reject`, "PATCH", { reason, note: note || undefined }))) {
      setDialog(null);
      setQuickReject(null);
    }
  };

  const addNote = (id: string, note: string) =>
    run(id, () => reviewRequest(`${base(id)}/note`, "POST", { note }));

  const onPanelAction = (action: PanelAction) => {
    if (!openSubmission) return;
    setActionError(null);
    if (action === "start") void startReview(openSubmission.id);
    else setDialog({ kind: action, id: openSubmission.id });
  };

  const closePanel = useCallback(() => {
    setOpenId(null);
    setActionError(null);
  }, []);

  return (
    <div className="min-h-screen mt-[60px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/home"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <FiArrowLeft size={14} /> Back to library
        </Link>

        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold uppercase tracking-wide text-text-primary">
            Pending submissions
          </h1>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div role="tablist" aria-label="Submission status" className="mb-4 flex flex-wrap gap-2">
          {REVIEW_TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={status === tab.status}
              onClick={() => changeFilter(() => setStatus(tab.status))}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === tab.status
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label} ({counts[tab.status]})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => changeFilter(() => setCategory(e.target.value))}
            className={selectClass}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            aria-label="University"
            value={universityId}
            onChange={(e) => changeFilter(() => setUniversityId(e.target.value))}
            className={selectClass}
          >
            <option value="">All universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.abbr ? `${u.abbr} — ${u.name}` : u.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => changeFilter(() => setSort(e.target.value as Sort))}
            className={selectClass}
          >
            <option value="oldest">Sort: Oldest first</option>
            <option value="newest">Sort: Newest first</option>
          </select>
        </div>

        {actionError && !openSubmission && !dialog && (
          <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-text-primary">
            {actionError}
          </p>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <div className="hidden grid-cols-[2fr_1fr_1.5fr_1fr] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted md:grid">
            <span>Title</span>
            <span>Category</span>
            <span>From</span>
            <span>Submitted</span>
          </div>

          {listError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-text-secondary">{listError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : !data ? (
            <p className="p-8 text-center text-sm text-text-secondary">Loading submissions...</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-text-secondary">
              Nothing here. {status === "submitted" ? "The queue is clear." : ""}
            </p>
          ) : (
            <ul className={isLoading ? "opacity-60" : ""}>
              {rows.map((s) => {
                const from = [s.universityAbbr ?? s.universityName, s.departmentName]
                  .filter(Boolean)
                  .join(" · ");
                const when = [
                  s.level ? (/^\d+$/.test(s.level) ? `${s.level}L` : s.level) : "",
                  s.semester ?? "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const canQuickReject = viewer.canReject && isDecidable(s.status);
                const rejecting = quickReject?.id === s.id;
                return (
                  <li key={s.id} className="border-b border-border px-5 py-4 last:border-b-0">
                    <div className="grid gap-2 md:grid-cols-[2fr_1fr_1.5fr_1fr] md:gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{s.title}</p>
                        <p className="truncate text-xs text-text-muted">
                          {s.courseCode ? `${s.courseCode} · ` : ""}
                          {s.submittedBy.name}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {categoryLabel(s.category, s.subcategory)}
                      </p>
                      <div className="text-sm text-text-secondary">
                        <p className="truncate">{from || "—"}</p>
                        {when && <p className="text-xs text-text-muted">{when}</p>}
                      </div>
                      <p className="text-sm text-text-secondary">{timeAgo(s.submittedAt)}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge submission={s} viewer={viewer} />
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setOpenId(s.id);
                          }}
                          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
                        >
                          {isDecidable(s.status) ? "Review →" : "View →"}
                        </button>
                        {canQuickReject && !rejecting && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setQuickReject({ id: s.id, reason: "" });
                            }}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                          >
                            Quick Reject
                          </button>
                        )}
                      </div>
                    </div>

                    {canQuickReject && rejecting && (
                      <form
                        className="mt-3 flex flex-col gap-2 sm:flex-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (quickReject.reason.trim()) void reject(s.id, quickReject.reason.trim());
                        }}
                      >
                        <input
                          autoFocus
                          value={quickReject.reason}
                          onChange={(e) => setQuickReject({ id: s.id, reason: e.target.value })}
                          maxLength={1000}
                          placeholder="Reason (shown to the submitter)"
                          aria-label="Rejection reason"
                          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={!quickReject.reason.trim() || busyId === s.id}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                          >
                            {busyId === s.id ? "Rejecting..." : "Confirm Reject"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickReject(null)}
                            className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages} · {data.total} total
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

      {openSubmission && (
        <ReviewPanel
          submission={openSubmission}
          viewer={viewer}
          busy={busyId === openSubmission.id}
          error={dialog ? null : actionError}
          onClose={closePanel}
          onAction={onPanelAction}
          onAddNote={(note) => addNote(openSubmission.id, note)}
        />
      )}

      {dialog && dialogSubmission && (dialog.kind === "verify" || dialog.kind === "endorse") && (
        <VerifyModal
          tier={dialog.kind === "verify" ? 1 : 2}
          busy={busyId === dialog.id}
          error={actionError}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
          onConfirm={(note) => void verify(dialog.id, dialog.kind === "verify" ? 1 : 2, note)}
        />
      )}
      {dialog && dialogSubmission && dialog.kind === "reject" && (
        <RejectModal
          busy={busyId === dialog.id}
          error={actionError}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
          onConfirm={(reason, note) => void reject(dialog.id, reason, note)}
        />
      )}
    </div>
  );
}
