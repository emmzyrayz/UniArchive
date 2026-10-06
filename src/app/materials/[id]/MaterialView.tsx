// app/materials/[id]/MaterialView.tsx
// One UniLibrary material: its details and, as tabs, the PDF (opened in the
// reader), typed questions (past questions) and typed notes (notes and
// textbooks). Public; reading the PDF and contributing need a sign-in.
// Rendered by page.tsx on the server with the material already loaded, so
// the HTML (title, course, school, outline, a preview of the typed
// questions and notes) is there for search engines and slow phones alike.
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { UploaderByline } from "@/components/unilibrary/UploaderByline";
import { OUTLINE_LABELS } from "@/lib/outline";
import { usePathname, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiArrowRight, FiEdit3 } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { NOTE_CATEGORIES, QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { formatFileSize } from "@/assets/data/libraryData";
import { timeAgo } from "@/components/admin/reviewShared";
import { BADGE_CLASS, categoryBadge, levelLabel } from "@/components/unilibrary/materialLabels";
import { PastQuestionViewer } from "@/components/layer2/PastQuestionViewer";
import { ContentViewer } from "@/components/layer2/ContentViewer";
import type { MaterialDetail } from "@/types/layer2";
import type { TypedPreview } from "@/lib/materialDetail";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants/layer2";
import { hasHigherOrEqualRole } from "@/types/roles";
import { VerificationBadge } from "@/components/unilibrary/VerificationBadge";
import { UnverifiedNotice, useUnverifiedNotice } from "@/components/unilibrary/UnverifiedNotice";
import { ReportMaterialDialog } from "@/components/unilibrary/ReportMaterialDialog";

type Tab = "pdf" | "questions" | "notes";

const TABS: Tab[] = ["pdf", "questions", "notes"];

function MaterialViewContent({ material: m, preview }: { material: MaterialDetail; preview: TypedPreview }) {
  const pathname = usePathname();
  // ?tab= opens a tab (the conversion workspace links back to the one it filled)
  const requestedTab = useSearchParams().get("tab");
  const { hasActiveSession, userProfile } = useUser();
  const [tab, setTab] = useState<Tab>(TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "pdf");
  // Counts change as people add typed content on this page
  const [counts, setCounts] = useState<{ questions?: number; notes?: number }>({});
  const unverified = !!m.unverified;
  const notice = useUnverifiedNotice(m._id, unverified);
  const [reporting, setReporting] = useState(false);

  const backLink = (
    <Link href="/unilibrary" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
      <FiArrowLeft aria-hidden /> Back to UniLibrary
    </Link>
  );

  const questionCount = counts.questions ?? m.typedQuestionCount;
  const noteCount = counts.notes ?? m.typedNoteCount;
  // A tab shows where that kind of content belongs, or wherever some exists
  const showQuestions = (!!m.category && QUESTION_CATEGORIES.includes(m.category)) || questionCount > 0;
  const showNotes = (!!m.category && NOTE_CATEGORIES.includes(m.category)) || noteCount > 0;
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
        {notice.isOpen && (
          <UnverifiedNotice
            unidentified={!m.category}
            onClose={notice.close}
            onReport={() => {
              notice.close();
              setReporting(true);
            }}
          />
        )}
        {reporting && <ReportMaterialDialog materialId={m._id} signedIn={hasActiveSession} onClose={() => setReporting(false)} />}

        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${BADGE_CLASS} ${badge.className}`}>{badge.label}</span>
            <VerificationBadge unverified={unverified} tier={m.verificationTier} onExplain={notice.open} />
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
            {!unverified && (
              <>
                {" · "}
                <button type="button" className="hover:text-text-primary hover:underline" onClick={() => setReporting(true)}>
                  Report
                </button>
              </>
            )}
          </p>
          {unverified && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <p>
                <strong>Unverified:</strong>{" "}
                {m.category
                  ? "these details haven't been checked by our team yet and may be wrong."
                  : "nobody has said what this PDF is yet."}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <button type="button" className="font-semibold underline" onClick={() => setReporting(true)}>
                  Report a problem
                </button>
              </p>
            </div>
          )}
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

        {hasActiveSession && ((tab === "questions" && (!!m.category && QUESTION_CATEGORIES.includes(m.category))) ||
          (tab === "notes" && (!!m.category && NOTE_CATEGORIES.includes(m.category)) && !!userProfile && hasHigherOrEqualRole(userProfile.role, "collaborator"))) && (
          <Link
            href={`/contribute/${m._id}`}
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10"
          >
            <FiEdit3 aria-hidden className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-text-primary">
              <span className="font-semibold">{tab === "questions" ? "Type out these questions" : "Write typed notes"}</span>
              <span className="block text-xs text-text-secondary">
                The PDF beside the editor. Your work saves as you go, even offline.
              </span>
            </span>
            <FiArrowRight aria-hidden className="shrink-0 text-primary" />
          </Link>
        )}

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
          {tab === "pdf" && preview.questions.length > 0 && (
            <section className="mt-6 rounded-xl border border-border bg-surface-raised p-6" aria-labelledby="questions-preview">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="questions-preview" className="font-semibold text-text-primary">
                  Questions in this paper
                </h2>
                <button type="button" onClick={() => setTab("questions")} className="text-sm font-medium text-primary hover:underline">
                  All {questionCount} typed questions and answers
                </button>
              </div>
              <ol className="space-y-2 text-sm text-text-secondary">
                {preview.questions.map((q) => (
                  <li key={q.label} className="flex gap-3">
                    <span className="w-8 shrink-0 font-semibold text-text-primary">{q.label}.</span>
                    <span className="min-w-0 flex-1">{q.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {tab === "pdf" && preview.notes.length > 0 && (
            <section className="mt-6 rounded-xl border border-border bg-surface-raised p-6" aria-labelledby="notes-preview">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="notes-preview" className="font-semibold text-text-primary">
                  Typed notes
                </h2>
                <button type="button" onClick={() => setTab("notes")} className="text-sm font-medium text-primary hover:underline">
                  Read the notes
                </button>
              </div>
              <ul className="space-y-1 text-sm text-text-secondary">
                {preview.notes.map((n, i) => (
                  <li key={i}>
                    {DOCUMENT_TYPE_LABELS[n.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ?? "Note"}
                    {n.chapterNumber !== undefined && ` ${n.chapterNumber}`}: <span className="text-text-primary">{n.title}</span>
                  </li>
                ))}
              </ul>
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

export function MaterialView({ material, preview }: { material: MaterialDetail; preview: TypedPreview }) {
  return (
    <Suspense fallback={null}>
      <MaterialViewContent material={material} preview={preview} />
    </Suspense>
  );
}
