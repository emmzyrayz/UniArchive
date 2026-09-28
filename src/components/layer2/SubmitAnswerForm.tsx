// components/layer2/SubmitAnswerForm.tsx
// Answer a typed question: the answer (LaTeX supported), workings for
// calculations, an optional explanation, and the chosen option for MCQs.
"use client";

import { useState, type FormEvent } from "react";
import { LIMITS } from "@/lib/constants/layer2";
import { adminRequest, primaryButton, secondaryButton } from "@/components/admin/adminUi";
import type { AnswerDto, QuestionDto } from "@/types/layer2";
import { MathText, MathTextarea } from "./math";

export function SubmitAnswerForm({
  question,
  onSubmitted,
  onCancel,
}: {
  question: QuestionDto;
  onSubmitted: (answer: AnswerDto) => void;
  onCancel: () => void;
}) {
  const [answerText, setAnswerText] = useState("");
  const [workings, setWorkings] = useState("");
  const [explanation, setExplanation] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isObjective = question.questionType === "objective";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { answer } = await adminRequest<{ answer: AnswerDto }>(
        `/api/materials/${question.materialId}/questions/${question.id}/answers`,
        "POST",
        {
          answerText,
          workings: workings.trim() || undefined,
          explanation: explanation.trim() || undefined,
          ...(isObjective ? { selectedOption } : {}),
        },
      );
      onSubmitted(answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your answer.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-surface p-3">
      {isObjective && question.options && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-xs font-medium text-text-secondary">Your choice</legend>
          {question.options.map((o) => (
            <label key={o.label} className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name={`answer-${question.id}`}
                value={o.label}
                checked={selectedOption === o.label}
                onChange={() => setSelectedOption(o.label)}
                required
                className="mt-1"
              />
              <span className="font-semibold">{o.label}.</span>
              <MathText text={o.text} />
            </label>
          ))}
        </fieldset>
      )}
      <MathTextarea
        label={isObjective ? "Why is it correct?" : "Your answer"}
        value={answerText}
        onChange={setAnswerText}
        maxLength={LIMITS.answerText}
        rows={4}
        required
      />
      {question.questionType === "calculation" && (
        <MathTextarea label="Workings (optional)" value={workings} onChange={setWorkings} maxLength={LIMITS.workings} rows={4} />
      )}
      {!isObjective && (
        <MathTextarea
          label="Explanation (optional)"
          value={explanation}
          onChange={setExplanation}
          maxLength={LIMITS.explanation}
          rows={2}
          placeholder="Why this is correct"
        />
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !answerText.trim() || (isObjective && !selectedOption)}
          className={primaryButton}
        >
          {busy ? "Submitting…" : "Submit answer"}
        </button>
      </div>
    </form>
  );
}
