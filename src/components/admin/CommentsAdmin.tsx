// components/admin/CommentsAdmin.tsx
// /admin/comments: comments flagged by readers (5+ reports), with
// dismiss (reviewed, it's fine) and delete (breaks the guidelines).
"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminCommentDto, AdminCommentsResponse } from "@/types/admin";
import { timeAgo } from "./reviewShared";
import {
  ActionError,
  AdminPageShell,
  ListState,
  Pager,
  StatusTabs,
  adminRequest,
  cardClass,
  dangerButton,
  secondaryButton,
  selectClass,
  useAdminList,
} from "./adminUi";

type Status = "reported" | "all";
type Sort = "most_reported" | "newest";

function CommentRow({
  comment: c,
  onUpdated,
}: {
  comment: AdminCommentDto;
  onUpdated: (updated: Partial<AdminCommentDto> & { id: string }) => void;
}) {
  const [confirm, setConfirm] = useState<"dismiss" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (action: "dismiss" | "delete") => {
    setBusy(true);
    setError(null);
    try {
      const { comment } = await adminRequest<{ comment: Partial<AdminCommentDto> & { id: string } }>(
        `/api/admin/comments/${c.id}`,
        "PATCH",
        { action },
      );
      setConfirm(null);
      onUpdated(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={cardClass}>
      <p className="text-xs text-text-muted">
        {c.parentId ? "↩ Reply on" : "On"}: <span className="font-medium text-text-secondary">&ldquo;{c.materialTitle}&rdquo;</span>
        {c.parentId && c.parentAuthorUpid && <> (in reply to @{c.parentAuthorUpid})</>}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        by @{c.authorUpid} · {timeAgo(c.createdAt)} ·{" "}
        <span className={c.reportCount ? "font-semibold text-red-600 dark:text-red-400" : ""}>
          {c.reportCount} report{c.reportCount === 1 ? "" : "s"}
        </span>
        {c.isDeleted && <span className="ml-1 rounded-full bg-neutral-500/10 px-2 py-0.5">deleted</span>}
        {!c.isDeleted && !c.isReported && c.reportCount === 0 && (
          <span className="ml-1 rounded-full bg-green-500/10 px-2 py-0.5 text-green-700 dark:text-green-400">reviewed</span>
        )}
      </p>
      <p className={`mt-3 whitespace-pre-line break-words text-sm ${c.isDeleted ? "italic text-text-muted" : "text-text-primary"}`}>
        {c.isDeleted ? c.text : <>&ldquo;{c.text}&rdquo;</>}
      </p>

      {confirm ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          <span className="mr-auto text-text-secondary">
            {confirm === "dismiss" ? "Mark as reviewed? The reports are cleared." : "Delete this comment?"}
          </span>
          <button type="button" onClick={() => setConfirm(null)} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(confirm)}
            className={confirm === "delete" ? dangerButton : secondaryButton}
          >
            {busy ? "Working…" : confirm === "dismiss" ? "Mark as reviewed" : "Delete"}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {c.bookId && (
            <Link href={`/read/${c.bookId}`} className={secondaryButton}>
              View material →
            </Link>
          )}
          {!c.isDeleted && (c.isReported || c.reportCount > 0) && (
            <button type="button" onClick={() => setConfirm("dismiss")} className={secondaryButton}>
              Dismiss
            </button>
          )}
          {!c.isDeleted && (
            <button type="button" onClick={() => setConfirm("delete")} className={dangerButton}>
              Delete
            </button>
          )}
        </div>
      )}
      <ActionError message={error} />
    </li>
  );
}

export function CommentsAdmin() {
  const [status, setStatus] = useState<Status>("reported");
  const [sort, setSort] = useState<Sort>("most_reported");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ status, sort, page: String(page) });
  const { data, loading, error, reload, patch } = useAdminList<AdminCommentsResponse>(
    `/api/admin/comments?${query}`,
  );

  const onUpdated = (updated: Partial<AdminCommentDto> & { id: string }) => {
    patch((d) => {
      // Decided comments leave the Reported tab; All keeps them, updated
      const leaves = status === "reported" && !updated.isReported;
      return {
        ...d,
        reportedCount: Math.max(0, d.reportedCount - (leaves ? 1 : 0)),
        total: leaves ? Math.max(0, d.total - 1) : d.total,
        comments: leaves
          ? d.comments.filter((c) => c.id !== updated.id)
          : d.comments.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      };
    });
  };

  const comments = data?.comments ?? [];
  return (
    <AdminPageShell
      title="Reported comments"
      subtitle="Comments readers reported 5 or more times. Nothing is removed until a moderator decides."
      loading={loading}
      onRefresh={reload}
      actions={
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as Sort);
            setPage(1);
          }}
          aria-label="Sort"
        >
          <option value="most_reported">Most reported</option>
          <option value="newest">Newest</option>
        </select>
      }
    >
      <StatusTabs<Status>
        tabs={[
          { id: "reported", label: "Reported", count: data?.reportedCount },
          { id: "all", label: "All" },
        ]}
        active={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
      <ListState
        loading={loading}
        error={error}
        empty={comments.length === 0}
        emptyText={status === "reported" ? "No reported comments. All clear." : "No comments yet."}
      >
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} onUpdated={onUpdated} />
          ))}
        </ul>
      </ListState>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </AdminPageShell>
  );
}
