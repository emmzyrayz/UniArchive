// components/admin/surveys/ImportQuestions.tsx
// "Paste questions": adds questions written elsewhere (by hand or an AI
// tool, in the README "Writing survey questions" format) to the builder.
// Checked as you paste with the same cleaner the server uses.
"use client";

import { useMemo, useState } from "react";
import { LIMITS, QUESTION_TYPE_LABELS, parseQuestionImport, type SurveyQuestion } from "@/lib/survey/questions";
import { Modal } from "../ReviewModals";
import { inputClass, primaryButton, secondaryButton } from "../adminUi";

export function ImportQuestions({
  existing,
  hasAnswers,
  onImport,
  onClose,
}: {
  existing: number;
  /** Answers are in: new questions must be optional */
  hasAnswers: boolean;
  onImport: (questions: SurveyQuestion[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const result = useMemo(() => (text.trim() ? parseQuestionImport(text) : null), [text]);
  const room = LIMITS.questions - existing;
  const count = result?.questions.length ?? 0;
  const tooMany = count > room;
  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of result?.questions ?? []) counts.set(QUESTION_TYPE_LABELS[q.type], (counts.get(QUESTION_TYPE_LABELS[q.type]) ?? 0) + 1);
    return [...counts].map(([label, n]) => `${n} ${label.toLowerCase()}`).join(", ");
  }, [result]);

  return (
    <Modal title="Paste questions" onClose={onClose}>
      <p className="mb-2 text-sm text-text-secondary">
        Paste a JSON list of questions, or the <code>```json</code> block an AI tool gave you. The format is in the README under &quot;Writing
        survey questions&quot;. They&apos;re added after the current questions.
      </p>
      <textarea
        className={`${inputClass} min-h-48 font-mono text-xs`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'[\n  { "type": "yes_no", "label": "Do you study on your phone?", "required": true }\n]'}
        aria-label="Questions as JSON"
        spellCheck={false}
      />
      {result?.error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-text-primary">
            {count} question{count === 1 ? "" : "s"} ready{byType && `: ${byType}`}.
          </p>
          {tooMany && (
            <p className="text-red-600 dark:text-red-400">
              This survey has room for {room} more (at most {LIMITS.questions}). Split them into another survey.
            </p>
          )}
          {hasAnswers && <p className="text-amber-700 dark:text-amber-400">People have answered already, so these are added as optional.</p>}
          {result.problems.length > 0 && (
            <details className="text-amber-700 dark:text-amber-400" open={result.problems.length <= 3}>
              <summary className="cursor-pointer">
                {result.problems.length} thing{result.problems.length === 1 ? "" : "s"} to fix after adding (they stop the survey opening)
              </summary>
              <ul className="mt-1 list-disc pl-5">
                {result.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryButton} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={!result || !!result.error || count === 0 || tooMany}
          onClick={() => {
            if (!result) return;
            onImport(hasAnswers ? result.questions.map((q) => ({ ...q, required: false })) : result.questions);
            onClose();
          }}
        >
          Add {count || ""} question{count === 1 ? "" : "s"}
        </button>
      </div>
    </Modal>
  );
}
