// components/admin/broadcasts/BroadcastsAdmin.tsx
// /admin/mail/broadcasts: drafts and history, plus the template picker
// that starts a new draft (/admin/mail/broadcasts?new=1).
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminBroadcastDto, AdminBroadcastsResponse } from "@/types/admin";
import { BROADCAST_TEMPLATES, getTemplate, type BroadcastTemplateId } from "@/lib/broadcast/templates";
import { describeAudience } from "@/lib/broadcast/audience";
import { timeAgo } from "../reviewShared";
import {
  AdminPageShell,
  ListState,
  Pager,
  StatusTabs,
  adminRequest,
  cardClass,
  primaryButton,
  useAdminList,
} from "../adminUi";

type Tab = "all" | "draft" | "scheduled" | "sent";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
];

const STATUS_STYLE: Record<AdminBroadcastDto["status"], string> = {
  draft: "bg-neutral-500/10 text-text-secondary",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  sending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sent: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "bg-neutral-500/10 text-text-muted",
};

function TemplatePicker({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<BroadcastTemplateId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (templateId: BroadcastTemplateId) => {
    setBusy(templateId);
    setError(null);
    try {
      const { broadcast } = await adminRequest<{ broadcast: AdminBroadcastDto }>("/api/admin/broadcasts", "POST", { templateId });
      router.push(`/admin/mail/broadcasts/${broadcast.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start a draft.");
      setBusy(null);
    }
  };

  return (
    <section className={`${cardClass} mb-8`} aria-labelledby="pick-template">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="pick-template" className="font-semibold text-text-primary">
          Pick a template
        </h2>
        <button type="button" className="text-sm text-text-secondary hover:text-text-primary" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BROADCAST_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => start(t.id)}
            disabled={busy !== null}
            className="rounded-xl border border-border bg-surface p-4 text-left transition-shadow hover:shadow-md disabled:opacity-60"
          >
            <span className="text-2xl" aria-hidden>
              {t.emoji}
            </span>
            <span className="mt-2 block font-semibold text-text-primary">{busy === t.id ? "Starting..." : t.label}</span>
            <span className="mt-1 block text-xs text-text-secondary">{t.description}</span>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {t.kind === "choose" ? "Announcement or newsletter" : t.kind === "newsletter" ? "Newsletter" : "Announcement"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function BroadcastsAdmin({ startNew }: { startNew: boolean }) {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [picking, setPicking] = useState(startNew);
  const { data, loading, error, reload } = useAdminList<AdminBroadcastsResponse>(`/api/admin/broadcasts?status=${tab}&page=${page}`);
  const broadcasts = data?.broadcasts ?? [];

  return (
    <AdminPageShell
      title="Broadcasts"
      subtitle={
        <>
          Bulk email through Brevo, to people who accept that kind of email.{" "}
          <Link href="/admin/mail" className="text-primary hover:underline">
            Email one user instead
          </Link>
        </>
      }
      loading={loading}
      onRefresh={reload}
      actions={
        !picking && (
          <button type="button" className={primaryButton} onClick={() => setPicking(true)}>
            New broadcast
          </button>
        )
      }
    >
      {picking && <TemplatePicker onCancel={() => setPicking(false)} />}

      <StatusTabs
        tabs={TABS}
        active={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      />
      <ListState loading={loading} error={error} empty={broadcasts.length === 0} emptyText="No broadcasts here yet.">
        <ul className="space-y-3">
          {broadcasts.map((b) => {
            const t = getTemplate(b.templateId);
            return (
              <li key={b.id}>
                <Link href={`/admin/mail/broadcasts/${b.id}`} className={`${cardClass} block transition-shadow hover:shadow-md`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                    <p className="font-semibold text-text-primary">
                      {t?.emoji} {b.name}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{b.subject || "(no subject yet)"}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {b.kind === "newsletter" ? "Newsletter" : "Announcement"} · {describeAudience(b.audience)}
                    {b.recipientCount !== undefined && ` · ${b.recipientCount.toLocaleString()} recipients`} · edited by{" "}
                    {b.updatedBy.name} {timeAgo(b.updatedAt)}
                    {b.status === "draft" && b.problems.length > 0 && (
                      <span className="text-amber-700 dark:text-amber-400"> · {b.problems.length} thing(s) to finish</span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </ListState>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </AdminPageShell>
  );
}
