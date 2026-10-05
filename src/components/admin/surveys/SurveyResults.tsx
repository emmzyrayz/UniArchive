// components/admin/surveys/SurveyResults.tsx
// /admin/surveys/[id]/results: per-question charts (CSS bars), filters by
// school, faculty, department, level, who answered, account and dates,
// the individual responses, and CSV/JSON export of what's filtered.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdminSurveyDto } from "@/lib/survey/surveys";
import { QUESTION_TYPE_LABELS, RESPONDENT_ROLES, answerText, type SurveyQuestion } from "@/lib/survey/questions";
import type { CountRow, QuestionSummary, SurveyResponseRow, SurveyResponsesResponse, SurveyResultsResponse } from "@/types/survey";
import { timeAgo } from "../reviewShared";
import { AdminPageShell, ListState, Pager, StatusTabs, adminRequest, cardClass, dangerButton, inputClass, secondaryButton, selectClass, useAdminList } from "../adminUi";

interface Filters {
  school: string;
  faculty: string;
  department: string;
  level: string;
  role: string;
  account: string;
  from: string;
  to: string;
  q: string;
}
const NO_FILTERS: Filters = { school: "", faculty: "", department: "", level: "", role: "", account: "", from: "", to: "", q: "" };

const query = (f: Filters, extra: Record<string, string | number> = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v !== "" && v !== undefined) p.set(k, String(v));
  return p.toString();
};
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const roleLabel = (v?: string) => RESPONDENT_ROLES.find((r) => r.value === v)?.label ?? v;

function Bars({ rows, of, highlight }: { rows: CountRow[]; of: number; highlight?: (r: CountRow) => string | undefined }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
          <span className="truncate text-text-secondary" title={r.label}>
            {r.label}
          </span>
          <span className="h-5 overflow-hidden rounded bg-surface" aria-hidden>
            <span className={`block h-full rounded ${highlight?.(r) ?? "bg-primary/70"}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="w-20 text-right tabular-nums text-text-primary">
            {r.count} <span className="text-xs text-text-muted">({pct(r.count, of)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function SummaryCard({ q, s, index, onSeeAll }: { q: SurveyQuestion; s: QuestionSummary; index: number; onSeeAll: () => void }) {
  return (
    <section className={cardClass} aria-labelledby={`sum-${q.id}`}>
      <div className="mb-3">
        <h3 id={`sum-${q.id}`} className="font-semibold text-text-primary">
          <span className="text-text-muted">{index + 1}. </span>
          {q.label}
        </h3>
        <p className="text-xs text-text-muted">
          {QUESTION_TYPE_LABELS[q.type]} · {s.answered} answered{s.skipped > 0 && ` · ${s.skipped} skipped`}
          {s.kind === "choice" && s.multi && " · people could pick several"}
        </p>
      </div>
      {s.answered === 0 ? (
        <p className="text-sm text-text-muted">No answers yet.</p>
      ) : s.kind === "choice" || s.kind === "yes_no" ? (
        <>
          <Bars rows={s.rows} of={s.answered} />
          {s.kind === "choice" && s.otherTexts.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-primary">What people wrote in &quot;Other&quot; ({s.otherTexts.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
                {s.otherTexts.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : s.kind === "numeric" ? (
        <>
          <dl className="mb-3 grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["Average", s.average],
                ["Median", s.median],
                ["Lowest", s.min],
                ["Highest", s.max],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="rounded-lg bg-surface p-2">
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="text-lg font-semibold text-text-primary">{v ?? "–"}</dd>
              </div>
            ))}
          </dl>
          {s.nps && (
            <p className="mb-3 text-sm text-text-secondary">
              Recommend score <strong className="text-text-primary">{s.nps.score}</strong> ({s.nps.promoters} gave 9-10, {s.nps.passives} gave 7-8,{" "}
              {s.nps.detractors} gave 0-6)
            </p>
          )}
          <Bars
            rows={s.rows}
            of={s.answered}
            highlight={s.nps ? (r) => (Number(r.key) >= 9 ? "bg-green-500/70" : Number(r.key) <= 6 ? "bg-red-500/60" : "bg-amber-500/60") : undefined}
          />
        </>
      ) : (
        <>
          <ul className="space-y-2">
            {s.latest.map((t, i) => (
              <li key={i} className="whitespace-pre-line rounded-lg bg-surface p-3 text-sm text-text-primary">
                {t}
              </li>
            ))}
          </ul>
          {s.answered > s.latest.length && (
            <button type="button" className="mt-2 text-sm text-primary hover:underline" onClick={onSeeAll}>
              Read all {s.answered} answers
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ResponseCard({ r, questions, onDelete }: { r: SurveyResponseRow; questions: SurveyQuestion[]; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const who = r.respondent;
  const place = [who.school, who.faculty, who.department].filter(Boolean).join(" · ");
  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {who.name || (r.account ? r.account.name : "Anonymous")}
            {r.account && <span className="font-normal text-text-muted"> · @{r.account.upid}</span>}
          </p>
          <p className="text-xs text-text-muted">
            {[roleLabel(who.role), who.level, place].filter(Boolean).join(" · ") || "No details given"}
            {who.schoolUnlisted && " · school not in our list"}
            {who.awaitingReview && " · school awaiting review"}
          </p>
          {who.email && <p className="text-xs text-text-secondary">{who.email}</p>}
        </div>
        <p className="text-xs text-text-muted" title={new Date(r.submittedAt).toLocaleString()}>
          {timeAgo(r.submittedAt)}
          {r.editCount > 0 && ` · changed ${r.editCount}×`}
        </p>
      </div>
      <dl className={`mt-3 space-y-2 text-sm ${open ? "" : "max-h-40 overflow-hidden"}`}>
        {questions.map((q, i) => (
          <div key={q.id}>
            <dt className="text-xs text-text-muted">
              {i + 1}. {q.label}
            </dt>
            <dd className="whitespace-pre-line text-text-primary">{answerText(q, r.answers[q.id]) || <span className="text-text-muted">(skipped)</span>}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <button type="button" className="text-primary hover:underline" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Show all answers"}
        </button>
        {confirm ? (
          <span className="flex items-center gap-2 text-text-secondary">
            Delete this response?
            <button
              type="button"
              className={dangerButton}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDelete();
                setBusy(false);
                setConfirm(false);
              }}
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="text-red-600 hover:underline dark:text-red-400" onClick={() => setConfirm(true)}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function Select({ label, value, onChange, rows, all }: { label: string; value: string; onChange: (v: string) => void; rows: CountRow[]; all: string }) {
  return (
    <label className="text-xs text-text-secondary">
      {label}
      <select className={`${selectClass} mt-1 w-full`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {rows.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label} ({r.count})
          </option>
        ))}
      </select>
    </label>
  );
}

type Tab = "summary" | "responses";

export function SurveyResults({ id }: { id: string }) {
  const [survey, setSurvey] = useState<AdminSurveyDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("summary");
  const [page, setPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    adminRequest<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}`)
      .then(({ survey }) => setSurvey(survey))
      .catch((err: Error) => setLoadError(err.message));
  }, [id]);

  // Search applies after a pause in typing
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const qs = query(filters);
  const results = useAdminList<SurveyResultsResponse>(`/api/admin/surveys/${id}/results?${qs}`);
  const responses = useAdminList<SurveyResponsesResponse>(`/api/admin/surveys/${id}/responses?${query(filters, { page })}`);
  const data = results.data;
  const filtered = qs !== "";

  const set = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const byId = useMemo(() => new Map((data?.summaries ?? []).map((s) => [s.questionId, s])), [data]);
  const timelineMax = Math.max(1, ...(data?.timeline ?? []).map((t) => t.count));

  if (loadError) {
    return (
      <AdminPageShell title="Survey results">
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={survey ? `Results: ${survey.title}` : "Survey results"}
      subtitle={
        <>
          <Link href={`/admin/surveys/${id}`} className="text-primary hover:underline">
            Edit survey
          </Link>{" "}
          ·{" "}
          <Link href="/admin/surveys" className="text-primary hover:underline">
            All surveys
          </Link>
        </>
      }
      loading={results.loading}
      onRefresh={() => {
        results.reload();
        responses.reload();
      }}
      actions={
        <>
          <a className={secondaryButton} href={`/api/admin/surveys/${id}/export?${query(filters, { format: "csv" })}`}>
            Export CSV
          </a>
          <a className={secondaryButton} href={`/api/admin/surveys/${id}/export?${query(filters, { format: "json" })}`}>
            JSON
          </a>
        </>
      }
    >
      <section className={`${cardClass} mb-5`} aria-label="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="School"
            value={filters.school}
            all="All schools"
            rows={data?.facets.schools ?? []}
            onChange={(v) => set({ school: v, faculty: "", department: "" })}
          />
          {filters.school && filters.school !== "unlisted" && (
            <Select
              label="Faculty"
              value={filters.faculty}
              all="All faculties"
              rows={data?.facets.faculties ?? []}
              onChange={(v) => set({ faculty: v, department: "" })}
            />
          )}
          {filters.faculty && (
            <Select label="Department" value={filters.department} all="All departments" rows={data?.facets.departments ?? []} onChange={(v) => set({ department: v })} />
          )}
          <Select label="Level" value={filters.level} all="All levels" rows={data?.facets.levels ?? []} onChange={(v) => set({ level: v })} />
          <Select label="Who" value={filters.role} all="Everyone" rows={data?.facets.roles ?? []} onChange={(v) => set({ role: v })} />
          <Select label="Account" value={filters.account} all="Signed in or out" rows={data?.facets.accounts ?? []} onChange={(v) => set({ account: v })} />
          <label className="text-xs text-text-secondary">
            From
            <input type="date" className={`${inputClass} mt-1`} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="text-xs text-text-secondary">
            To
            <input type="date" className={`${inputClass} mt-1`} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <label className="text-xs text-text-secondary sm:col-span-2">
            Search written answers and names
            <input type="search" className={`${inputClass} mt-1`} value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-text-secondary">
            {data ? (
              filtered ? (
                <>
                  <strong className="text-text-primary">{data.matched.toLocaleString()}</strong> of {data.total.toLocaleString()} responses match
                </>
              ) : (
                <>
                  <strong className="text-text-primary">{data.total.toLocaleString()}</strong> responses
                </>
              )
            ) : (
              "Loading..."
            )}
          </p>
          {filtered && (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                setFilters(NO_FILTERS);
                setSearch("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <StatusTabs
        tabs={[
          { id: "summary" as Tab, label: "Summary" },
          { id: "responses" as Tab, label: "Responses", count: data?.matched },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "summary" ? (
        <ListState loading={results.loading} error={results.error} empty={!data || !survey} emptyText="No results.">
          {data && survey && (
            <div className="space-y-4">
              {data.truncated && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  The charts cover the newest 50,000 matching responses. The export has them all.
                </p>
              )}
              {data.timeline.length > 1 && (
                <section className={cardClass} aria-label="Responses per day">
                  <p className="mb-2 text-sm font-medium text-text-primary">Responses per day</p>
                  <div className="flex h-24 items-end gap-0.5">
                    {data.timeline.map((t) => (
                      <span
                        key={t.day}
                        className="min-w-1 flex-1 rounded-t bg-primary/70"
                        style={{ height: `${Math.max(4, (t.count / timelineMax) * 100)}%` }}
                        title={`${t.day}: ${t.count}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 flex justify-between text-xs text-text-muted">
                    <span>{data.timeline[0].day}</span>
                    <span>{data.timeline[data.timeline.length - 1].day}</span>
                  </p>
                </section>
              )}
              {data.matched === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
                  {filtered ? "No responses match these filters." : "No responses yet."}
                </p>
              ) : (
                survey.questions.map((q, i) => {
                  const s = byId.get(q.id);
                  return s ? (
                    <SummaryCard
                      key={q.id}
                      q={q}
                      s={s}
                      index={i}
                      onSeeAll={() => {
                        setTab("responses");
                        window.scrollTo({ top: 0 });
                      }}
                    />
                  ) : null;
                })
              )}
            </div>
          )}
        </ListState>
      ) : (
        <>
          {deleteError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
          <ListState
            loading={responses.loading}
            error={responses.error}
            empty={(responses.data?.responses.length ?? 0) === 0}
            emptyText={filtered ? "No responses match these filters." : "No responses yet."}
          >
            <ul className="space-y-3">
              {(responses.data?.responses ?? []).map((r) => (
                <ResponseCard
                  key={r.id}
                  r={r}
                  questions={survey?.questions ?? []}
                  onDelete={async () => {
                    setDeleteError(null);
                    try {
                      await adminRequest(`/api/admin/surveys/${id}/responses/${r.id}`, "DELETE");
                      responses.reload();
                      results.reload();
                    } catch (err) {
                      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the response.");
                    }
                  }}
                />
              ))}
            </ul>
          </ListState>
          <Pager page={page} totalPages={responses.data?.totalPages ?? 1} onPage={setPage} />
        </>
      )}
    </AdminPageShell>
  );
}
