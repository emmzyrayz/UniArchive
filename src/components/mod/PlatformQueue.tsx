// components/mod/PlatformQueue.tsx
// The platform file queue (/mod/materials/queue, also under /admin): PDFs
// staff uploaded (or students gifted) that wait to be filled in and
// published, plus the published and discarded ones. Each pending file opens
// in the verify workspace.
"use client";

import { useState } from "react";
import Link from "next/link";
import { FiUploadCloud } from "react-icons/fi";
import {
  AdminPageShell,
  ListState,
  Pager,
  StatusTabs,
  cardClass,
  useAdminList,
} from "@/components/admin/adminUi";
import { timeAgo } from "@/components/admin/reviewShared";
import { useStaffArea } from "@/components/admin/staffArea";
import { formatFileSize } from "@/assets/data/libraryData";
import type { PlatformFileDto } from "@/lib/platformUploads";

type Scope = "mine" | "all" | "gifts" | "inbox";
type Status = "pending" | "published" | "discarded";

interface QueueResponse {
  files: PlatformFileDto[];
  total: number;
  page: number;
  pageSize: number;
  pending: Record<Scope, number | null>;
}

const SCOPE_LABELS: Record<Scope, string> = {
  mine: "My uploads",
  all: "All staff uploads",
  gifts: "Gifts",
  inbox: "Drive inbox",
};

const STATUS_TABS: { id: Status; label: string }[] = [
  { id: "pending", label: "Waiting" },
  { id: "published", label: "Published" },
  { id: "discarded", label: "Discarded" },
];

export function PlatformQueue({ scopes }: { scopes: Scope[] }) {
  const { base } = useStaffArea();
  const [scope, setScope] = useState<Scope>(scopes[0]);
  const [status, setStatus] = useState<Status>("pending");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminList<QueueResponse>(
    `/api/mod/uploads?scope=${scope}&status=${status}&page=${page}`,
  );

  const files = data?.files ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminPageShell
      title="Upload queue"
      subtitle="Platform PDFs waiting for their details. Published ones are credited to UniArchive."
      loading={loading}
      onRefresh={reload}
      actions={
        <Link
          href={`${base}/materials/upload`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <FiUploadCloud aria-hidden /> Upload PDFs
        </Link>
      }
    >
      {scopes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Whose files">
          {scopes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => {
                setScope(s);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                scope === s
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {SCOPE_LABELS[s]}
              {data?.pending[s] ? ` · ${data.pending[s]} waiting` : ""}
            </button>
          ))}
        </div>
      )}

      <StatusTabs
        tabs={STATUS_TABS.map((t) => ({
          ...t,
          count: t.id === "pending" ? (data?.pending[scope] ?? undefined) : undefined,
        }))}
        active={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />

      <ListState
        loading={loading}
        error={error}
        empty={files.length === 0}
        emptyText={
          status === "pending"
            ? scope === "gifts"
              ? "No gifted PDFs are waiting."
              : scope === "inbox"
                ? "Nothing new shared with UniArchive's Google Drive."
                : "Nothing is waiting. Upload some PDFs to get started."
            : `No ${status} files.`
        }
      >
        <ul className="space-y-3">
          {files.map((f) => (
            <li key={f.id} className={`${cardClass} flex flex-wrap items-center gap-4`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-primary" title={f.originalFileName}>
                  {f.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {f.originalFileName} · {formatFileSize(f.fileSize)}
                  {!!f.suggestionCount && (
                    <span className="font-semibold text-primary">
                      {" "}
                      · 💡 {f.suggestionCount} suggestion{f.suggestionCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {f.originalSize > f.fileSize && ` (was ${formatFileSize(f.originalSize)})`}
                  {f.pageCount ? ` · ${f.pageCount} pages` : ""} · {f.source === "drive_inbox"
                    ? `shared with UniArchive${f.sharedByName ? ` by ${f.sharedByName}` : ""} ${timeAgo(f.createdAt)}`
                    : `${f.source === "gift" ? "gifted" : f.source === "drive" ? "imported from Drive" : "uploaded"} by @${f.uploadedByUpid} ${timeAgo(f.createdAt)}`}
                </p>
                {f.giftNote && (
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">&ldquo;{f.giftNote}&rdquo;</p>
                )}
                {f.claim && !f.claim.mine && (
                  <p className="mt-1 text-xs text-warning">@{f.claim.byUpid} is working on this</p>
                )}
                {f.draftSavedAt && status === "pending" && (
                  <p className="mt-1 text-xs text-text-secondary">Draft saved {timeAgo(f.draftSavedAt)}</p>
                )}
              </div>
              {status === "pending" && (
                <Link
                  href={`${base}/materials/verify/${f.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-surface"
                >
                  {f.draftSavedAt ? "Continue" : "Verify"}
                </Link>
              )}
              {status === "published" && f.materialId && (
                <Link href={`/materials/${f.materialId}`} className="text-sm text-primary hover:underline">
                  View in UniLibrary
                </Link>
              )}
            </li>
          ))}
        </ul>
      </ListState>
      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </AdminPageShell>
  );
}
