// components/dashboard/ConversionsTab.tsx
// The dashboard's Conversions tab: what the user has typed out (from
// /api/conversions/stats, built from their published questions and notes)
// and the conversions they still have in progress (/api/conversions/drafts),
// each with a way back into the workspace.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiEdit3, FiFileText, FiHelpCircle, FiLayers, FiMessageCircle, FiTrash2 } from "react-icons/fi";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { timeAgo } from "@/components/admin/reviewShared";
import type { ConversionStats } from "@/lib/conversionStats";
import type { ConversionKind } from "@/lib/conversions";
import { NEEDS_TYPING_MAX, type NeedsTypingResult } from "@/types/needsTyping";

interface DraftSummary {
  id: string;
  materialId: string;
  materialTitle: string;
  courseCode?: string;
  materialAvailable: boolean;
  kind: ConversionKind;
  targetDocId?: string;
  updatedAt: string;
  stale: boolean;
  progress: { questions?: number; submitted?: number; words?: number; title?: string };
}

type Loaded<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error" };

function useJson<T>(url: string, version: number): Loaded<T> {
  const [state, setState] = useState<{ key: string; value: Loaded<T> } | null>(null);
  const key = `${url}#${version}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ key, value: { status: "ready", data: (await res.json()) as T } });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ key, value: { status: "error" } });
      });
    return () => controller.abort();
  }, [url, key]);
  // Keep showing the last result while a reload is in flight
  return state?.value ?? { status: "loading" };
}

const continueHref = (d: DraftSummary) => `/contribute/${d.materialId}${d.targetDocId ? `?doc=${d.targetDocId}` : ""}`;

function draftLine(d: DraftSummary): string {
  if (d.kind === "questions") {
    const total = d.progress.questions ?? 0;
    const submitted = d.progress.submitted ?? 0;
    return total ? `${submitted} of ${total} question${total === 1 ? "" : "s"} submitted` : "No questions yet";
  }
  const words = d.progress.words ?? 0;
  return `${d.targetDocId ? "Editing" : "Note"}${d.progress.title ? ` “${d.progress.title}”` : ""} · ${words.toLocaleString()} words`;
}

function ActivityChart({ weekly }: { weekly: ConversionStats["weekly"] }) {
  const max = Math.max(1, ...weekly.map((w) => w.questions + w.notes));
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Questions and notes published per week, last 12 weeks">
        {weekly.map((w) => {
          const total = w.questions + w.notes;
          const label = new Date(w.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
          return (
            <div key={w.weekStart} className="flex h-full flex-1 flex-col justify-end" title={`Week of ${label}: ${w.questions} questions, ${w.notes} notes`}>
              {total > 0 ? (
                <>
                  <div className="rounded-t bg-accent/70" style={{ height: `${(w.notes / max) * 100}%` }} />
                  <div className={`bg-primary ${w.notes ? "" : "rounded-t"}`} style={{ height: `${(w.questions / max) * 100}%` }} />
                </>
              ) : (
                <div className="h-0.5 rounded bg-border" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-muted">
        <span>12 weeks ago</span>
        <span className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-primary" /> Questions
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-accent/70" /> Notes
          </span>
        </span>
        <span>This week</span>
      </div>
    </div>
  );
}

function InProgress({ drafts, onChanged }: { drafts: DraftSummary[]; onChanged: () => void }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discard = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/conversions/drafts/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error();
      setConfirming(null);
      onChanged();
    } catch {
      setError("Couldn't discard it. Check your connection and try again.");
    }
  };

  if (drafts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
        Nothing in progress. Open a past question, notes or textbook in the UniLibrary and choose “Type out”.
      </p>
    );
  }
  return (
    <>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface-raised">
        {drafts.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {d.courseCode ? `${d.courseCode} · ` : ""}
                {d.materialTitle}
              </p>
              <p className="text-xs text-text-muted">
                {draftLine(d)} · {timeAgo(d.updatedAt)}
                {d.stale && <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-warning">Untouched for months</span>}
              </p>
            </div>
            {confirming === d.id ? (
              <span className="flex items-center gap-3 text-xs">
                Discard?
                <button type="button" onClick={() => void discard(d.id)} className="font-semibold text-error hover:underline">
                  Discard
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="hover:underline">
                  Keep
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(d.id)}
                  aria-label={`Discard the draft for ${d.materialTitle}`}
                  className="text-text-muted hover:text-error"
                >
                  <FiTrash2 aria-hidden />
                </button>
                {d.materialAvailable ? (
                  <Link href={continueHref(d)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Continue
                  </Link>
                ) : (
                  <span className="text-xs text-text-muted">Material removed</span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </>
  );
}

function NeedsTyping({ data, more, onMore }: { data: NeedsTypingResult; more: boolean; onMore: () => void }) {
  if (data.items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
        Everything we have is typed out. Thank you! New uploads show up here.
      </p>
    );
  }
  return (
    <>
      {!data.personalised && (
        <p className="mb-3 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-text-secondary">
          Showing popular materials.{" "}
          <Link href="/profile/edit" className="font-semibold text-primary hover:underline">
            Set your school and department
          </Link>{" "}
          to see ones from your own courses first.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.items.map((m) => (
          <li key={m.id} className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
            <p className="text-xs font-medium text-primary">{m.reason}</p>
            <Link href={`/materials/${m.id}`} className="mt-1 font-semibold text-text-primary hover:underline">
              {m.courseCode ? `${m.courseCode}: ${m.title}` : m.title}
            </Link>
            <p className="mt-0.5 text-xs text-text-muted">
              {[m.kind, m.school, m.level, m.pageCount ? `${m.pageCount} pages` : "", `${m.viewCount.toLocaleString()} views`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {m.othersTyping > 0 && (
              <p className="mt-1 text-xs text-warning">
                {m.othersTyping === 1 ? "1 person is" : `${m.othersTyping} people are`} typing this already
              </p>
            )}
            <div className="mt-auto flex justify-end pt-3">
              <Link
                href={`/contribute/${m.id}`}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {m.conversion === "questions" ? "Type out the questions" : "Write typed notes"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {more && (
        <div className="mt-3 text-center">
          <button type="button" onClick={onMore} className="text-sm font-semibold text-primary hover:underline">
            Show more
          </button>
        </div>
      )}
    </>
  );
}

export function ConversionsTab() {
  const [version, setVersion] = useState(0);
  const stats = useJson<{ stats: ConversionStats }>("/api/conversions/stats", version);
  const drafts = useJson<{ drafts: DraftSummary[] }>("/api/conversions/drafts", version);
  const [needsLimit, setNeedsLimit] = useState(6);
  const needs = useJson<NeedsTypingResult>(`/api/conversions/needs-typing?limit=${needsLimit}`, version);
  // useJson keeps the last list on screen while "Show more" loads
  const needsData = needs.status === "ready" ? needs.data : null;
  const reload = () => setVersion((v) => v + 1);

  const retry = (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm text-text-muted">Couldn&apos;t load this. Check your connection and try again.</p>
      <button type="button" onClick={reload} className="text-sm font-semibold text-primary hover:underline">
        Retry
      </button>
    </div>
  );
  const loading = <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">Loading…</p>;

  const s = stats.status === "ready" ? stats.data.stats : null;
  return (
    <div className="space-y-8">
      <section aria-labelledby="conv-progress">
        <h2 id="conv-progress" className="mb-4 font-semibold text-text-primary">
          In progress
        </h2>
        {drafts.status === "ready" ? <InProgress drafts={drafts.data.drafts} onChanged={reload} /> : drafts.status === "error" ? retry : loading}
      </section>

      <section aria-labelledby="conv-needs">
        <h2 id="conv-needs" className="font-semibold text-text-primary">
          Materials that need typing
        </h2>
        <p className="mb-4 mt-1 text-sm text-text-secondary">
          No one has typed these out yet. Typing them makes them searchable and easy to study on a phone.
        </p>
        {needsData ? (
          <NeedsTyping
            data={needsData}
            more={needsData.items.length >= needsLimit && needsLimit < NEEDS_TYPING_MAX}
            onMore={() => setNeedsLimit(NEEDS_TYPING_MAX)}
          />
        ) : needs.status === "error" ? (
          retry
        ) : (
          loading
        )}
      </section>

      <section aria-labelledby="conv-stats" className="space-y-6">
        <h2 id="conv-stats" className="font-semibold text-text-primary">
          What you&apos;ve typed out
        </h2>
        {!s ? (
          stats.status === "error" ? retry : loading
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatsCard label="Questions typed" value={s.questions.total} display={s.questions.total.toLocaleString()} icon={<FiHelpCircle size={20} />} delay={0} />
              <StatsCard label="Notes written" value={s.notes.total} display={s.notes.total.toLocaleString()} icon={<FiFileText size={20} />} delay={0.05} />
              <StatsCard label="Words typed" value={s.words} display={s.words.toLocaleString()} icon={<FiEdit3 size={20} />} delay={0.1} />
              <StatsCard label="Materials helped" value={s.materialsHelped} display={s.materialsHelped.toLocaleString()} icon={<FiLayers size={20} />} delay={0.15} />
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface-raised p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-text-muted">Questions verified</dt>
                <dd className="font-semibold text-text-primary">
                  {s.questions.verified.toLocaleString()}
                  {s.questions.disputed > 0 && <span className="ml-1 text-xs font-normal text-warning">({s.questions.disputed} disputed)</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Verification rate</dt>
                <dd className="font-semibold text-text-primary">{s.verificationRate === null ? "—" : `${Math.round(s.verificationRate * 100)}%`}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-text-muted">
                  <FiMessageCircle aria-hidden /> Answers to your questions
                </dt>
                <dd className="font-semibold text-text-primary">{s.answers.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Note views</dt>
                <dd className="font-semibold text-text-primary">
                  {s.notes.views.toLocaleString()}
                  {s.notes.endorsed > 0 && <span className="ml-1 text-xs font-normal text-text-muted">· {s.notes.endorsed} endorsed</span>}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <h3 className="mb-4 text-sm font-semibold text-text-primary">Last 12 weeks</h3>
              <ActivityChart weekly={s.weekly} />
            </div>

            {s.recent.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Recently published</h3>
                <ul className="divide-y divide-border rounded-xl border border-border bg-surface-raised">
                  {s.recent.map((r) => (
                    <li key={`${r.kind}:${r.id}`}>
                      <Link
                        href={`/materials/${r.materialId}?tab=${r.kind === "question" ? "questions" : "notes"}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface"
                      >
                        {r.kind === "question" ? <FiHelpCircle aria-hidden className="shrink-0 text-primary" /> : <FiFileText aria-hidden className="shrink-0 text-accent" />}
                        <span className="min-w-0 flex-1 truncate text-text-primary">
                          <span className="font-medium">{r.label}</span> <span className="text-text-muted">· {r.materialTitle}</span>
                        </span>
                        <span className="shrink-0 text-xs text-text-muted">{timeAgo(r.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-text-muted">Updated every few minutes.</p>
          </>
        )}
      </section>
    </div>
  );
}
