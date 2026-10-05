// components/layer2/PastQuestionViewer.tsx
// A past question paper, typed: every question in order, with its accepted
// answer inline and the rest on demand. Signed-in readers can answer (once
// per question), upvote and add questions; lecturer+ accept answers. MCQ
// answers stay hidden behind "Reveal answer" for exam practice.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowUp, FiCheckCircle, FiPlus } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { can } from "@/lib/auth/permissions";
import { QUESTION_TYPE_LABELS } from "@/lib/constants/layer2";
import { ROLE_LABELS } from "@/components/profile/profileUi";
import { timeAgo } from "@/components/admin/reviewShared";
import { adminRequest, secondaryButton } from "@/components/admin/adminUi";
import { roleHierarchy, type UserRole } from "@/types/roles";
import type { AnswerDto, QuestionDto } from "@/types/layer2";
import { MathText } from "./math";
import { AddQuestionForm } from "./AddQuestionForm";
import { SubmitAnswerForm } from "./SubmitAnswerForm";
import { ProfileHandle } from "@/components/profile/ProfileHandle";

const smallButton = "text-xs font-medium text-neutral-500 hover:text-primary disabled:opacity-50";
const atLeast = (role: UserRole, min: UserRole) => roleHierarchy[role] >= roleHierarchy[min];

const questionLabel = (q: Pick<QuestionDto, "questionNumber" | "questionPart">) =>
  `Q${q.questionNumber}${q.questionPart ?? ""}`;

function AnswerCard({
  answer: a,
  question,
  onChange,
  onAccepted,
}: {
  answer: AnswerDto;
  question: QuestionDto;
  onChange: (a: AnswerDto) => void;
  onAccepted: (a: AnswerDto) => void;
}) {
  const { hasActiveSession, userProfile } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwn = userProfile?.upid === a.submittedByUpid;
  const mayAccept = !!userProfile && can(userProfile.role, "submission.verify_tier2") && !isOwn && !a.isAccepted;
  const base = `/api/materials/${question.materialId}/questions/${question.id}/answers/${a.id}`;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${a.isAccepted ? "border-green-500/40 bg-green-500/5" : "border-border"}`}>
      <p className="text-xs text-text-muted">
        <ProfileHandle upid={a.submittedByUpid} className="font-medium text-text-secondary hover:underline" />{" "}
        · {timeAgo(a.createdAt)}
      </p>
      {a.isAccepted && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
          <FiCheckCircle aria-hidden /> Accepted
          {a.acceptedBy && ` by @${a.acceptedBy.upid} (${ROLE_LABELS[a.acceptedBy.role as UserRole] ?? a.acceptedBy.role})`}
        </p>
      )}
      {a.selectedOption && <p className="mt-2 text-sm font-semibold text-text-primary">Answer: {a.selectedOption}</p>}
      <MathText text={a.answerText} className="mt-2 text-sm text-text-primary" />
      {a.workings && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Workings</p>
          <MathText text={a.workings} className="text-sm text-text-secondary" />
        </div>
      )}
      {a.explanation && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Why</p>
          <MathText text={a.explanation} className="text-sm text-text-secondary" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {hasActiveSession && !isOwn ? (
          <button
            type="button"
            disabled={busy}
            aria-pressed={!!a.upvotedByMe}
            onClick={() =>
              run(async () => {
                const data = await adminRequest<{ upvoted: boolean; upvoteCount: number }>(`${base}/upvote`, "POST");
                onChange({ ...a, upvotedByMe: data.upvoted, upvoteCount: data.upvoteCount });
              })
            }
            className={`inline-flex items-center gap-1 text-xs font-medium ${a.upvotedByMe ? "text-primary" : "text-neutral-500 hover:text-primary"}`}
          >
            <FiArrowUp aria-hidden /> {a.upvoteCount}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <FiArrowUp aria-hidden /> {a.upvoteCount}
          </span>
        )}
        {mayAccept && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const data = await adminRequest<{ answer: AnswerDto }>(`${base}/accept`, "PATCH");
                onAccepted(data.answer);
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline dark:text-green-400"
          >
            <FiCheckCircle aria-hidden /> Accept
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function QuestionBlock({
  question: q,
  onChange,
  onRemoved,
}: {
  question: QuestionDto;
  onChange: (q: QuestionDto) => void;
  onRemoved: () => void;
}) {
  const pathname = usePathname();
  const { hasActiveSession, userProfile } = useUser();
  const [answers, setAnswers] = useState<AnswerDto[] | null>(null);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = userProfile?.role;
  const isOwn = userProfile?.upid === q.submittedByUpid;
  const unanswered = q.answerCount === 0;
  const mayEdit = !!role && unanswered && (isOwn || atLeast(role, "auditor"));
  const mayDelete = !!role && unanswered && (isOwn || atLeast(role, "com_admin"));
  const isObjective = q.questionType === "objective";
  // Correct option: marked by a lecturer, or else what the accepted answer chose
  const correctLabel = q.options?.find((o) => o.isCorrect)?.label ?? q.acceptedAnswer?.selectedOption;

  const loadAnswers = async () => {
    setLoadingAnswers(true);
    setError(null);
    try {
      const data = await adminRequest<{ answers: AnswerDto[] }>(
        `/api/materials/${q.materialId}/questions/${q.id}/answers`,
      );
      setAnswers(data.answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load answers.");
    } finally {
      setLoadingAnswers(false);
    }
  };

  const onAccepted = (accepted: AnswerDto) => {
    onChange({ ...q, acceptedAnswerId: accepted.id, acceptedAnswer: accepted });
    setAnswers((list) =>
      list
        ? [accepted, ...list.filter((x) => x.id !== accepted.id).map((x) => ({ ...x, isAccepted: false }))]
        : list,
    );
  };

  if (editing) {
    return (
      <AddQuestionForm
        materialId={q.materialId}
        existing={q}
        canMarkCorrect={!!role && can(role, "submission.verify_tier2")}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          onChange({ ...updated, answeredByMe: q.answeredByMe });
        }}
      />
    );
  }

  // Answers shown: the full list once loaded, else just the accepted one
  const shown = answers ?? (q.acceptedAnswer ? [q.acceptedAnswer] : []);

  return (
    <article className="space-y-3 border-b border-border pb-6 last:border-b-0" aria-labelledby={`q-${q.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`q-${q.id}`} className="font-semibold text-text-primary">
          {questionLabel(q)}.{" "}
          <span className="text-sm font-normal text-text-muted">
            {q.marks !== undefined && `(${q.marks} mark${q.marks === 1 ? "" : "s"}) · `}
            {QUESTION_TYPE_LABELS[q.questionType]}
          </span>
        </h3>
        {(mayEdit || mayDelete) && (
          <span className="flex gap-3">
            {mayEdit && (
              <button type="button" onClick={() => setEditing(true)} className={smallButton}>
                Edit
              </button>
            )}
            {mayDelete &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-xs">
                  Delete?
                  <button
                    type="button"
                    className="font-semibold text-red-600 dark:text-red-400"
                    onClick={async () => {
                      try {
                        await adminRequest(`/api/materials/${q.materialId}/questions/${q.id}`, "DELETE");
                        onRemoved();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Couldn't delete.");
                        setConfirmDelete(false);
                      }
                    }}
                  >
                    Yes
                  </button>
                  <button type="button" className={smallButton} onClick={() => setConfirmDelete(false)}>
                    No
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className={smallButton}>
                  Delete
                </button>
              ))}
          </span>
        )}
      </div>
      <MathText text={q.questionText} className="text-sm text-text-primary" />

      {isObjective && q.options && (
        <div className="space-y-1">
          <ul className="space-y-1">
            {q.options.map((o) => {
              const correct = revealed && o.label === correctLabel;
              return (
                <li
                  key={o.label}
                  className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm ${correct ? "bg-green-500/10 font-medium text-green-800 dark:text-green-300" : "text-text-primary"}`}
                >
                  <span className="font-semibold">{o.label}.</span>
                  <MathText text={o.text} />
                  {correct && <span className="ml-auto text-xs">✓ correct</span>}
                </li>
              );
            })}
          </ul>
          {correctLabel ? (
            <button type="button" onClick={() => setRevealed((r) => !r)} className={smallButton}>
              {revealed ? "Hide answer" : "Reveal answer"}
            </button>
          ) : (
            <p className="text-xs text-text-muted">No confirmed answer yet.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Answers ({q.answerCount})</p>
        {/* For MCQs the accepted answer gives the option away, so it waits for Reveal */}
        {(!isObjective || revealed || answers) &&
          shown.map((a) => (
            <AnswerCard
              key={a.id}
              answer={a}
              question={q}
              onAccepted={onAccepted}
              onChange={(updated) => {
                setAnswers((list) => list?.map((x) => (x.id === updated.id ? updated : x)) ?? list);
                if (q.acceptedAnswer?.id === updated.id) onChange({ ...q, acceptedAnswer: updated });
              }}
            />
          ))}
        {!answers && q.answerCount > (q.acceptedAnswer ? 1 : 0) && (
          <button type="button" onClick={loadAnswers} disabled={loadingAnswers} className={smallButton}>
            {loadingAnswers ? "Loading…" : `Show all ${q.answerCount} answers`}
          </button>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {hasActiveSession ? (
        q.answeredByMe ? (
          <p className="text-xs text-text-muted">You&apos;ve answered this question.</p>
        ) : answering ? (
          <SubmitAnswerForm
            question={q}
            onCancel={() => setAnswering(false)}
            onSubmitted={(answer) => {
              setAnswering(false);
              setAnswers((list) => (list ? [...list, answer] : list));
              onChange({ ...q, answerCount: q.answerCount + 1, answeredByMe: true });
            }}
          />
        ) : (
          <button type="button" onClick={() => setAnswering(true)} className={secondaryButton}>
            + Submit an answer
          </button>
        )
      ) : (
        <p className="text-xs text-text-muted">
          <Link href={`/auth?view=signin&from=${encodeURIComponent(pathname)}`} className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to answer.
        </p>
      )}
    </article>
  );
}

export function PastQuestionViewer({
  materialId,
  onCountChange,
}: {
  materialId: string;
  onCountChange?: (count: number) => void;
}) {
  const { hasActiveSession, userProfile } = useUser();
  const [questions, setQuestions] = useState<QuestionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminRequest<{ questions: QuestionDto[] }>(`/api/materials/${materialId}/questions`)
      .then((data) => {
        if (!cancelled) setQuestions(data.questions);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Couldn't load the questions.");
      });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const update = (next: QuestionDto[]) => {
    setQuestions(next);
    onCountChange?.(next.length);
  };

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!questions) return <p className="text-sm text-text-muted">Loading questions…</p>;

  const lastNumber = questions.reduce((n, q) => Math.max(n, q.questionNumber), 0);
  return (
    <section className="space-y-6" aria-label="Typed questions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Typed questions ({questions.length})
        </h2>
        {hasActiveSession && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} inline-flex items-center gap-1`}>
            <FiPlus aria-hidden /> Add question
          </button>
        )}
      </div>

      {adding && (
        <AddQuestionForm
          materialId={materialId}
          suggestedNumber={lastNumber + 1}
          canMarkCorrect={!!userProfile && can(userProfile.role, "submission.verify_tier2")}
          onCancel={() => setAdding(false)}
          onSaved={(q) => {
            setAdding(false);
            update(
              [...questions, q].sort(
                (a, b) => a.questionNumber - b.questionNumber || (a.questionPart ?? "").localeCompare(b.questionPart ?? ""),
              ),
            );
          }}
        />
      )}

      {questions.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
          No questions typed yet.{" "}
          {hasActiveSession ? "Type out the first one so others can search, answer and practise it." : "Sign in to type out the first one."}
        </p>
      ) : (
        questions.map((q) => (
          <QuestionBlock
            key={q.id}
            question={q}
            onChange={(updated) => update(questions.map((x) => (x.id === updated.id ? updated : x)))}
            onRemoved={() => update(questions.filter((x) => x.id !== q.id))}
          />
        ))
      )}
    </section>
  );
}
