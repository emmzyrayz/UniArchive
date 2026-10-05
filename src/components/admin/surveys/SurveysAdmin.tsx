// components/admin/surveys/SurveysAdmin.tsx
// /admin/surveys: every survey by status, and "New survey" (starts a draft
// and opens the builder).
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminSurveyDto } from "@/lib/survey/surveys";
import { timeAgo } from "../reviewShared";
import { AdminPageShell, ActionError, ListState, Pager, StatusTabs, adminRequest, cardClass, primaryButton, useAdminList } from "../adminUi";

type Tab = "all" | AdminSurveyDto["status"];
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "draft", label: "Drafts" },
  { id: "closed", label: "Closed" },
];

export const SURVEY_STATUS_STYLE: Record<AdminSurveyDto["status"], string> = {
  draft: "bg-neutral-500/10 text-text-secondary",
  open: "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-neutral-500/10 text-text-muted",
};

interface ListResponse {
  surveys: AdminSurveyDto[];
  total: number;
  page: number;
  totalPages: number;
}

export function SurveysAdmin() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useAdminList<ListResponse>(`/api/admin/surveys?status=${tab}&page=${page}`);
  const surveys = list.data?.surveys ?? [];

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { survey } = await adminRequest<{ survey: AdminSurveyDto }>("/api/admin/surveys", "POST", {});
      router.push(`/admin/surveys/${survey.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start a survey.");
      setCreating(false);
    }
  };

  return (
    <AdminPageShell
      title="Surveys"
      subtitle="Ask students and visitors what they think. Open surveys are listed at /surveys; anyone can answer, signed in or not."
      loading={list.loading}
      onRefresh={list.reload}
      actions={
        <button type="button" className={primaryButton} onClick={create} disabled={creating}>
          {creating ? "Starting..." : "New survey"}
        </button>
      }
    >
      <ActionError message={error} />
      <StatusTabs
        tabs={TABS}
        active={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      />
      <ListState loading={list.loading} error={list.error} empty={surveys.length === 0} emptyText="No surveys here yet.">
        <ul className="space-y-3">
          {surveys.map((s) => (
            <li key={s.id}>
              <div className={`${cardClass} transition-shadow hover:shadow-md`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SURVEY_STATUS_STYLE[s.status]}`}>{s.status}</span>
                  <Link href={`/admin/surveys/${s.id}`} className="font-semibold text-text-primary hover:underline">
                    {s.title || "Untitled survey"}
                  </Link>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {s.questions.length} question{s.questions.length === 1 ? "" : "s"} · {s.responseCount.toLocaleString()} response
                  {s.responseCount === 1 ? "" : "s"} · edited by {s.updatedBy.name} {timeAgo(s.updatedAt)}
                  {s.status === "draft" && s.problems.length > 0 && (
                    <span className="text-amber-700 dark:text-amber-400"> · {s.problems.length} thing(s) to finish</span>
                  )}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <Link href={`/admin/surveys/${s.id}`} className="text-primary hover:underline">
                    {s.status === "draft" ? "Edit" : "Edit questions"}
                  </Link>
                  {s.responseCount > 0 && (
                    <Link href={`/admin/surveys/${s.id}/results`} className="text-primary hover:underline">
                      Results
                    </Link>
                  )}
                  {s.status === "open" && (
                    <a href={`/surveys/${s.slug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Public page
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ListState>
      <Pager page={page} totalPages={list.data?.totalPages ?? 1} onPage={setPage} />
    </AdminPageShell>
  );
}
