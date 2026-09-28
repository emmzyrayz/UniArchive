// components/layer2/AddQuestionForm.tsx
// Type out a past question (or edit one nobody has answered yet): number
// and part, text with LaTeX, type, marks, and options for objective
// questions. Lecturer+ can also mark the correct option.
"use client";

import { useState, type FormEvent } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { LIMITS, QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/constants/layer2";
import { adminRequest, inputClass, primaryButton, secondaryButton, selectClass } from "@/components/admin/adminUi";
import type { QuestionDto } from "@/types/layer2";
import { MathTextarea } from "./math";

type OptionRow = { label: string; text: string; isCorrect: boolean };

const nextLabel = (rows: OptionRow[]) => String.fromCharCode(65 + rows.length); // A, B, C...

export function AddQuestionForm({
  materialId,
  existing,
  suggestedNumber,
  canMarkCorrect,
  onSaved,
  onCancel,
}: {
  materialId: string;
  /** Editing this question instead of adding one */
  existing?: QuestionDto;
  suggestedNumber?: number;
  canMarkCorrect: boolean;
  onSaved: (question: QuestionDto) => void;
  onCancel: () => void;
}) {
  const [questionNumber, setQuestionNumber] = useState(String(existing?.questionNumber ?? suggestedNumber ?? 1));
  const [questionPart, setQuestionPart] = useState(existing?.questionPart ?? "");
  const [questionText, setQuestionText] = useState(existing?.questionText ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(existing?.questionType ?? "theory");
  const [marks, setMarks] = useState(existing?.marks !== undefined ? String(existing.marks) : "");
  const [options, setOptions] = useState<OptionRow[]>(
    existing?.options?.map((o) => ({ label: o.label, text: o.text, isCorrect: !!o.isCorrect })) ?? [
      { label: "A", text: "", isCorrect: false },
      { label: "B", text: "", isCorrect: false },
      { label: "C", text: "", isCorrect: false },
      { label: "D", text: "", isCorrect: false },
    ],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOption = (i: number, patch: Partial<OptionRow>) =>
    setOptions((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  // Relabel A, B, C… after a removal so labels stay consecutive
  const removeOption = (i: number) =>
    setOptions((rows) => rows.filter((_, j) => j !== i).map((r, j) => ({ ...r, label: String.fromCharCode(65 + j) })));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        questionNumber: Number(questionNumber),
        questionPart: questionPart.trim() || undefined,
        questionText,
        questionType,
        marks: marks === "" ? undefined : Number(marks),
        ...(questionType === "objective"
          ? { options: options.map((o) => ({ label: o.label, text: o.text, ...(o.isCorrect ? { isCorrect: true } : {}) })) }
          : {}),
      };
      const base = `/api/materials/${materialId}/questions`;
      const { question } = await adminRequest<{ question: QuestionDto }>(
        existing ? `${base}/${existing.id}` : base,
        existing ? "PATCH" : "POST",
        body,
      );
      onSaved(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the question.");
      setBusy(false);
    }
  };

  const fieldLabel = "block text-xs font-medium text-text-secondary";
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-primary/30 bg-surface-raised p-4">
      <p className="font-semibold text-text-primary">{existing ? "Edit question" : "Add a question"}</p>
      <div className="grid grid-cols-3 gap-3">
        <label className={fieldLabel}>
          Number
          <input type="number" min={1} max={LIMITS.maxQuestionNumber} required className={`mt-1 ${inputClass}`} value={questionNumber} onChange={(e) => setQuestionNumber(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Part (optional)
          <input className={`mt-1 ${inputClass}`} maxLength={LIMITS.questionPart} placeholder="a" value={questionPart} onChange={(e) => setQuestionPart(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Marks (optional)
          <input type="number" min={0} max={LIMITS.maxMarks} className={`mt-1 ${inputClass}`} value={marks} onChange={(e) => setMarks(e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>
        Type
        <select className={`mt-1 w-full ${selectClass}`} value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <MathTextarea label="Question" value={questionText} onChange={setQuestionText} maxLength={LIMITS.questionText} rows={5} required placeholder="Find the derivative of $f(x) = x^3 + 2x^2 - 5x + 3$" />

      {questionType === "objective" && (
        <fieldset className="space-y-2">
          <legend className={fieldLabel}>Options</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-text-secondary">{o.label}</span>
              <input
                className={inputClass}
                required
                maxLength={LIMITS.optionText}
                value={o.text}
                onChange={(e) => setOption(i, { text: e.target.value })}
                aria-label={`Option ${o.label}`}
              />
              {canMarkCorrect && (
                <label className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                  <input type="checkbox" checked={o.isCorrect} onChange={(e) => setOption(i, { isCorrect: e.target.checked })} />
                  Correct
                </label>
              )}
              {options.length > LIMITS.minOptions && (
                <button type="button" onClick={() => removeOption(i)} aria-label={`Remove option ${o.label}`} className="text-text-muted hover:text-red-600">
                  <FiX aria-hidden />
                </button>
              )}
            </div>
          ))}
          {options.length < LIMITS.maxOptions && (
            <button
              type="button"
              onClick={() => setOptions((rows) => [...rows, { label: nextLabel(rows), text: "", isCorrect: false }])}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <FiPlus aria-hidden /> Add option
            </button>
          )}
        </fieldset>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !questionText.trim()} className={primaryButton}>
          {busy ? "Saving…" : existing ? "Save changes" : "Add question"}
        </button>
      </div>
    </form>
  );
}
