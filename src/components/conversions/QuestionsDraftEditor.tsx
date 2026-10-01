// components/conversions/QuestionsDraftEditor.tsx
// Typing out past questions in the conversion workspace. Each question is a
// card in the draft (autosaved with everything else) and is submitted on
// its own as soon as it's done. A submit carries an Idempotency-Key made
// from the card's id, so retrying after a dropped connection never
// publishes it twice. Questions already typed out (by anyone) are listed so
// they aren't repeated.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCheck, FiChevronDown, FiChevronRight, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { LIMITS, QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/constants/layer2";
import { IDEMPOTENCY_HEADER, newClientItemId, type DraftQuestion } from "@/lib/conversions";
import type { DraftSession, DraftState } from "@/lib/draftSync";
import { inputClass, primaryButton, secondaryButton, selectClass } from "@/components/admin/adminUi";
import { MathText, MathTextarea } from "@/components/layer2/math";
import type { QuestionDto } from "@/types/layer2";

type Published = Pick<QuestionDto, "id" | "questionNumber" | "questionPart" | "questionText" | "submittedByUpid">;

type Options = NonNullable<DraftQuestion["options"]>;
const DEFAULT_OPTIONS: Options = ["A", "B", "C", "D"].map((label) => ({ label, text: "" }));
const label = (q: { questionNumber?: number; questionPart?: string }) =>
  `Q${q.questionNumber ?? "?"}${q.questionPart ?? ""}`;
const sameSlot = (a: { questionNumber?: number; questionPart?: string }, b: { questionNumber?: number; questionPart?: string }) =>
  a.questionNumber === b.questionNumber && (a.questionPart ?? "").toLowerCase() === (b.questionPart ?? "").toLowerCase();

export function QuestionsDraftEditor({
  session,
  state,
  materialId,
  currentPage,
  canMarkCorrect,
  onShowPage,
  onFinished,
}: {
  session: DraftSession;
  state: DraftState;
  materialId: string;
  currentPage: number;
  canMarkCorrect: boolean;
  onShowPage: (page: number) => void;
  onFinished: () => void;
}) {
  const questions = "questions" in state.payload ? state.payload.questions : [];
  const readOnly = state.readOnly;
  const [published, setPublished] = useState<Published[] | null>(null);
  const [showPublished, setShowPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Bumped after a submit to refresh the list
  const [publishedVersion, setPublishedVersion] = useState(0);
  const loadPublished = () => setPublishedVersion((v) => v + 1);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/materials/${materialId}/questions`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ questions: Published[] }>) : null))
      .then((data) => {
        if (data) setPublished(data.questions);
      })
      .catch(() => {
        // Offline: the list fills in later
      });
    return () => controller.abort();
  }, [materialId, publishedVersion]);

  // Read the latest payload at call time (not the render's), so quick edits never overwrite each other
  const current = () => {
    const p = session.getSnapshot().payload;
    return "questions" in p ? p.questions : [];
  };
  const setQuestion = (id: string, patch: Partial<DraftQuestion>) =>
    session.update({ questions: current().map((q) => (q.clientItemId === id ? { ...q, ...patch } : q)) }, currentPage);
  const remove = (id: string) => session.update({ questions: current().filter((q) => q.clientItemId !== id) });

  const nextNumber = () => {
    const numbers = [...current(), ...(published ?? [])].map((q) => q.questionNumber ?? 0);
    return Math.min(LIMITS.maxQuestionNumber, Math.max(0, ...numbers) + 1);
  };
  const add = () =>
    session.update(
      {
        questions: [
          ...current(),
          { clientItemId: newClientItemId(), questionNumber: nextNumber(), questionType: "theory", questionText: "", sourcePage: currentPage },
        ],
      },
      currentPage,
    );

  const submit = async (q: DraftQuestion) => {
    setSubmitting(q.clientItemId);
    setErrors((e) => {
      const next = { ...e };
      delete next[q.clientItemId];
      return next;
    });
    const fail = (message: string) => setErrors((e) => ({ ...e, [q.clientItemId]: message }));
    try {
      const body = {
        questionNumber: Number(q.questionNumber),
        questionPart: q.questionPart?.trim() || undefined,
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks === undefined || q.marks === "" ? undefined : Number(q.marks),
        ...(q.questionType === "objective"
          ? { options: (q.options ?? []).map((o) => ({ label: o.label, text: o.text, ...(o.isCorrect ? { isCorrect: true } : {}) })) }
          : {}),
      };
      let res: Response;
      try {
        res = await fetch(`/api/materials/${materialId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", [IDEMPOTENCY_HEADER]: `${materialId}:${q.clientItemId}` },
          body: JSON.stringify(body),
        });
      } catch {
        return fail("No connection. The question is saved here; submit it again when you're back online.");
      }
      const data = (await res.json().catch(() => ({}))) as { question?: QuestionDto; message?: string };
      if (res.status === 401) return fail("You've been signed out. Sign in again to submit (your work is saved here).");
      if (!res.ok || !data.question) return fail(data.message ?? `Couldn't submit (HTTP ${res.status}).`);
      const id = data.question.id;
      session.patchPayload((p) =>
        "questions" in p
          ? { questions: p.questions.map((x) => (x.clientItemId === q.clientItemId ? { ...x, submittedId: id, submittedAt: new Date().toISOString() } : x)) }
          : p,
      );
      loadPublished();
    } finally {
      setSubmitting(null);
    }
  };

  const pending = questions.filter((q) => !q.submittedId && q.questionText.trim());
  const finish = async () => {
    setFinishError(null);
    if (await session.finish()) onFinished();
    else setFinishError("Couldn't reach the server to finish. Your work is saved; try again when you're online.");
  };

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-xl border border-border bg-surface-raised">
        <button
          type="button"
          onClick={() => setShowPublished((v) => !v)}
          aria-expanded={showPublished}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-text-primary"
        >
          {showPublished ? <FiChevronDown aria-hidden /> : <FiChevronRight aria-hidden />}
          Already typed out {published ? `(${published.length})` : ""}
          <span className="ml-auto text-xs font-normal text-text-muted">Don&apos;t repeat these</span>
        </button>
        {showPublished && (
          <ul className="max-h-60 divide-y divide-border overflow-y-auto border-t border-border text-sm">
            {published?.length === 0 && <li className="px-4 py-3 text-text-muted">None yet. You&apos;re first!</li>}
            {published?.map((p) => (
              <li key={p.id} className="flex gap-3 px-4 py-2">
                <span className="w-12 shrink-0 font-semibold text-text-secondary">{label(p)}</span>
                <span className="line-clamp-1 min-w-0 text-text-primary">
                  <MathText text={p.questionText} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {questions.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
          Add a question, type it out from the PDF, then submit it. Everything you type is saved as you go.
        </p>
      )}

      {questions.map((q) =>
        q.submittedId ? (
          <div key={q.clientItemId} className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm">
            <FiCheck aria-hidden className="shrink-0 text-success" />
            <span className="font-semibold text-text-primary">{label(q)}</span>
            <span className="line-clamp-1 min-w-0 flex-1 text-text-secondary">
              <MathText text={q.questionText} />
            </span>
            <span className="shrink-0 text-xs text-success">Submitted</span>
            {!readOnly && (
              <button type="button" onClick={() => remove(q.clientItemId)} aria-label={`Hide ${label(q)} from this list`} className="shrink-0 text-text-muted hover:text-text-primary">
                <FiX aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <QuestionCard
            key={q.clientItemId}
            q={q}
            readOnly={readOnly}
            canMarkCorrect={canMarkCorrect}
            duplicate={!!published?.some((p) => sameSlot(p, q))}
            error={errors[q.clientItemId]}
            busy={submitting === q.clientItemId}
            onChange={(patch) => setQuestion(q.clientItemId, patch)}
            onRemove={() => remove(q.clientItemId)}
            onSubmit={() => void submit(q)}
            onShowPage={onShowPage}
          />
        ),
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={add} className={`${secondaryButton} inline-flex items-center gap-1`}>
            <FiPlus aria-hidden /> Add question
          </button>
          <span className="text-xs text-text-muted">From page {currentPage}</span>
          {questions.length > 0 && (
            <button type="button" onClick={() => (pending.length ? setConfirmFinish(true) : void finish())} className={`${primaryButton} ml-auto`}>
              Finish
            </button>
          )}
        </div>
      )}
      {confirmFinish && (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary">
          <p>
            {pending.length === 1 ? "1 question hasn't" : `${pending.length} questions haven't`} been submitted. Finishing
            discards {pending.length === 1 ? "it" : "them"}.
          </p>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => void finish()} className="font-semibold text-error hover:underline">
              Finish anyway
            </button>
            <button type="button" onClick={() => setConfirmFinish(false)} className="font-medium hover:underline">
              Keep working
            </button>
          </div>
        </div>
      )}
      {finishError && <p role="alert" className="text-sm text-error">{finishError}</p>}
      <p className="text-xs text-text-muted">
        Submitted questions appear on the{" "}
        <Link href={`/materials/${materialId}`} className="text-primary hover:underline">
          material&apos;s page
        </Link>{" "}
        straight away.
      </p>
    </div>
  );
}

function QuestionCard({
  q,
  readOnly,
  canMarkCorrect,
  duplicate,
  error,
  busy,
  onChange,
  onRemove,
  onSubmit,
  onShowPage,
}: {
  q: DraftQuestion;
  readOnly: boolean;
  canMarkCorrect: boolean;
  duplicate: boolean;
  error?: string;
  busy: boolean;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onSubmit: () => void;
  onShowPage: (page: number) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const options: Options = q.options ?? DEFAULT_OPTIONS;
  const setOption = (i: number, patch: Partial<Options[number]>) =>
    onChange({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const removeOption = (i: number) =>
    onChange({ options: options.filter((_, j) => j !== i).map((o, j) => ({ ...o, label: String.fromCharCode(65 + j) })) });
  const fieldLabel = "block text-xs font-medium text-text-secondary";
  const empty = !q.questionText.trim();
  const optionsIncomplete = q.questionType === "objective" && options.some((o) => !o.text.trim());

  return (
    <fieldset disabled={readOnly} className="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
      <legend className="sr-only">{label(q)}</legend>
      <div className="grid grid-cols-3 gap-3">
        <label className={fieldLabel}>
          Number
          <input
            type="number"
            min={1}
            max={LIMITS.maxQuestionNumber}
            className={`mt-1 ${inputClass}`}
            value={q.questionNumber ?? ""}
            onChange={(e) => onChange({ questionNumber: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        <label className={fieldLabel}>
          Part
          <input
            className={`mt-1 ${inputClass}`}
            maxLength={LIMITS.questionPart}
            placeholder="a"
            value={q.questionPart ?? ""}
            onChange={(e) => onChange({ questionPart: e.target.value })}
          />
        </label>
        <label className={fieldLabel}>
          Marks
          <input
            type="number"
            min={0}
            max={LIMITS.maxMarks}
            className={`mt-1 ${inputClass}`}
            value={q.marks ?? ""}
            onChange={(e) => onChange({ marks: e.target.value })}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className={`${fieldLabel} min-w-40 flex-1`}>
          Type
          <select
            className={`mt-1 w-full ${selectClass}`}
            value={q.questionType}
            onChange={(e) => {
              const questionType = e.target.value as QuestionType;
              onChange({ questionType, ...(questionType === "objective" && !q.options ? { options: DEFAULT_OPTIONS } : {}) });
            }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {q.sourcePage && (
          <button type="button" onClick={() => onShowPage(q.sourcePage!)} className="pb-2 text-xs font-medium text-primary hover:underline">
            Page {q.sourcePage}
          </button>
        )}
      </div>

      <MathTextarea
        label="Question"
        value={q.questionText}
        onChange={(questionText) => onChange({ questionText })}
        maxLength={LIMITS.questionText}
        rows={4}
        placeholder="Type the question exactly as it appears. Use the formula button for maths."
      />

      {q.questionType === "objective" && (
        <div className="space-y-2">
          <p className={fieldLabel}>Options</p>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-text-secondary">{o.label}</span>
              <input
                className={inputClass}
                maxLength={LIMITS.optionText}
                value={o.text}
                onChange={(e) => setOption(i, { text: e.target.value })}
                aria-label={`Option ${o.label}`}
              />
              {canMarkCorrect && (
                <label className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                  <input type="checkbox" checked={!!o.isCorrect} onChange={(e) => setOption(i, { isCorrect: e.target.checked })} />
                  Correct
                </label>
              )}
              {options.length > LIMITS.minOptions && (
                <button type="button" onClick={() => removeOption(i)} aria-label={`Remove option ${o.label}`} className="text-text-muted hover:text-error">
                  <FiX aria-hidden />
                </button>
              )}
            </div>
          ))}
          {options.length < LIMITS.maxOptions && (
            <button
              type="button"
              onClick={() => onChange({ options: [...options, { label: String.fromCharCode(65 + options.length), text: "" }] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <FiPlus aria-hidden /> Add option
            </button>
          )}
        </div>
      )}

      {duplicate && (
        <p className="text-xs text-warning">
          {label(q)} is already typed out. Change the number or part if this is a different question.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmRemove ? (
            <span className="flex items-center gap-3 text-sm">
              Delete this question?
              <button type="button" onClick={onRemove} className="font-semibold text-error hover:underline">
                Delete
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="hover:underline">
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (empty ? onRemove() : setConfirmRemove(true))}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-error"
            >
              <FiTrash2 aria-hidden /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || empty || !q.questionNumber || optionsIncomplete}
            className={`${primaryButton} ml-auto`}
          >
            {busy ? "Submitting…" : `Submit ${label(q)}`}
          </button>
        </div>
      )}
    </fieldset>
  );
}
