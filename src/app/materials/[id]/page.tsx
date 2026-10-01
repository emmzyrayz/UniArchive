// app/materials/[id]/page.tsx
// One UniLibrary material: its details and, as tabs, the PDF (opened in the
// reader), typed questions (past questions) and typed notes (notes and
// textbooks). Public; reading the PDF and contributing need a sign-in.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UploaderByline } from "@/components/unilibrary/UploaderByline";
import { OUTLINE_LABELS } from "@/lib/outline";
import { useParams, usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { NOTE_CATEGORIES, QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { formatFileSize } from "@/assets/data/libraryData";
import { timeAgo } from "@/components/admin/reviewShared";
import { BADGE_CLASS, categoryBadge, levelLabel } from "@/components/unilibrary/materialLabels";
import { PastQuestionViewer } from "@/components/layer2/PastQuestionViewer";
import { ContentViewer } from "@/components/layer2/ContentViewer";
import type { MaterialDetail } from "@/types/layer2";

type Tab = "pdf" | "questions" | "notes";

type State = { id: string; material: MaterialDetail } | { id: string; notFound: true } | { id: string; error: true };

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { hasActiveSession } = useUser();
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>("pdf");
  // Counts change as people add typed content on this page
  const [counts, setCounts] = useState<{ questions?: number; notes?: number }>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/materials/${encodeURIComponent(id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return setState({ id, notFound: true });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ id, material: (await res.json()) as MaterialDetail });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ id, error: true });
      });
    return () => controller.abort();
  }, [id]);

  const current = state?.id === id ? state : null;

  const backLink = (
    <Link href="/unilibrary" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
      <FiArrowLeft aria-hidden /> Back to UniLibrary
    </Link>
  );

  if (!current || !("material" in current)) {
    return (
      <div className="mt-[70px] min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {backLink}
          {!current ? (
            <div className="h-48 animate-pulse rounded-xl border border-border bg-surface-raised" />
          ) : "notFound" in current ? (
            <div className="rounded-xl border border-border bg-surface-raised p-10 text-center">
              <h1 className="text-lg font-semibold text-text-primary">Material not found</h1>
              <p className="mt-2 text-sm text-text-secondary">It doesn&apos;t exist or has been taken down.</p>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-surface-raised p-6 text-center text-sm text-text-secondary">
              Couldn&apos;t load this material. Check your connection and refresh.
            </p>
          )}
        </div>
      </div>
    );
  }

  const m = current.material;
  const questionCount = counts.questions ?? m.typedQuestionCount;
  const noteCount = counts.notes ?? m.typedNoteCount;
  // A tab shows where that kind of content belongs, or wherever some exists
  const showQuestions = QUESTION_CATEGORIES.includes(m.category) || questionCount > 0;
  const showNotes = NOTE_CATEGORIES.includes(m.category) || noteCount > 0;
  const badge = categoryBadge(m.category, m.subcategory);
  const place = [m.universityAbbr || m.universityName, m.courseCode, m.level && levelLabel(m.level), m.semester && `${m.semester} Semester`]
    .filter(Boolean)
    .join(" · ");

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "pdf", label: "Read PDF", show: true },
    { id: "questions", label: questionCount ? `Typed Questions (${questionCount})` : "Typed Questions", show: showQuestions },
    { id: "notes", label: noteCount ? `Typed Notes (${noteCount})` : "Typed Notes", show: showNotes },
  ];

  return (
    <div className="mt-[70px] min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {backLink}

        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${BADGE_CLASS} ${badge.className}`}>{badge.label}</span>
            <span className={`${BADGE_CLASS} border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300`}>✓ Verified</span>
            {m.verificationTier === "tier2" && (
              <span className={`${BADGE_CLASS} border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300`}>⭐ Endorsed</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {m.courseCode ? `${m.courseCode} — ${m.title}` : m.title}
            {m.academicYear && <span className="ml-2 text-base font-normal text-text-secondary">{m.academicYear}</span>}
          </h1>
          {place && <p className="text-sm text-text-secondary">{place}</p>}
          {m.description && <p className="text-sm text-text-secondary">{m.description}</p>}
          <p className="text-xs text-text-muted">
            Uploaded by{" "}
            <UploaderByline upid={m.submittedByUpid} isPlatform={m.isPlatform} />
            {m.uploaderTopBadge && <span title={m.uploaderTopBadge.name}> {m.uploaderTopBadge.emoji}</span>} ·{" "}
            {timeAgo(m.createdAt)} · {m.viewCount.toLocaleString()} views
            {!!m.pageCount && ` · ${m.pageCount} pages`} · {formatFileSize(m.fileSize)}
          </p>
          {m.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {m.tags.map((t) => (
                <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-text-secondary dark:bg-neutral-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        <div role="tablist" aria-label="Material content" className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        <div role="tabpanel">
          {tab === "pdf" && (
            <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
              <p className="text-sm text-text-secondary">
                {m.pageCount ? `${m.pageCount} pages · ` : ""}
                {formatFileSize(m.fileSize)}
              </p>
              {hasActiveSession ? (
                <Link
                  href={`/read/${m.bookId}`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  Open in the reader <FiArrowRight aria-hidden />
                </Link>
              ) : (
                <p className="mt-4 text-sm text-text-secondary">
                  <Link
                    href={`/auth?view=signin&from=${encodeURIComponent(pathname)}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to read the PDF. Typed content is open to everyone.
                </p>
              )}
              {!m.hasTypedContent && (showQuestions || showNotes) && (
                <p className="mt-6 text-xs text-text-muted">
                  No typed content yet. {showQuestions ? "Typing out the questions" : "Writing typed notes"} makes this
                  material searchable and easier to study on a phone.
                </p>
              )}
            </div>
          )}
          {tab === "pdf" && m.outline && m.outline.entries.length > 0 && (
            <section className="mt-6 rounded-xl border border-border bg-surface-raised p-6" aria-labelledby="outline-title">
              <h2 id="outline-title" className="mb-3 font-semibold text-text-primary">
                {OUTLINE_LABELS[m.outline.kind].title}
              </h2>
              <ol className="space-y-1 text-sm">
                {m.outline.entries.map((entry, i) => {
                  const label = entry.pageLabel ?? entry.page;
                  return (
                    <li
                      key={i}
                      style={{ paddingLeft: (entry.level - 1) * 18 }}
                      className={`flex items-baseline gap-3 ${entry.level === 1 ? "font-medium text-text-primary" : "text-text-secondary"}`}
                    >
                      {hasActiveSession && entry.page ? (
                        <Link href={`/read/${m.bookId}?page=${entry.page}`} className="min-w-0 flex-1 hover:text-primary hover:underline">
                          {entry.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1">{entry.title}</span>
                      )}
                      {label && <span className="shrink-0 tabular-nums text-xs text-text-muted">{label}</span>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {tab === "questions" && (
            <PastQuestionViewer materialId={m._id} onCountChange={(n) => setCounts((c) => ({ ...c, questions: n }))} />
          )}
          {tab === "notes" && (
            <ContentViewer materialId={m._id} onCountChange={(n) => setCounts((c) => ({ ...c, notes: n }))} />
          )}
        </div>
      </div>
    </div>
  );
}
