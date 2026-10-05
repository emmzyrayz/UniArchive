// components/survey/SurveyQuestions.tsx
// The questions of a survey as form fields. Used by the public form and the
// admin builder's live preview, so what admins see is what people answer.
// Answer shapes and validation live in lib/survey/questions.ts.
"use client";

import { FiStar } from "react-icons/fi";
import { LIMITS, type AnswerValue, type Answers, type SurveyQuestion } from "@/lib/survey/questions";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60";

function ChoiceList({
  q,
  value,
  onChange,
  disabled,
}: {
  q: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  disabled?: boolean;
}) {
  const multi = q.type === "multi_choice";
  const v = (value && typeof value === "object" ? value : {}) as { choice?: string; choices?: string[]; other?: string };
  const picked = new Set(multi ? v.choices ?? [] : v.choice ? [v.choice] : []);
  const otherOn = multi ? v.other !== undefined : "other" in v;

  const toggle = (id: string) => {
    if (!multi) return onChange({ choice: id });
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ choices: [...next], ...(v.other !== undefined && { other: v.other }) });
  };
  const setOther = (text: string | undefined) => {
    if (!multi) return onChange(text === undefined ? undefined : { other: text });
    onChange({ choices: [...picked], ...(text !== undefined && { other: text }) });
  };

  const box = `h-4 w-4 shrink-0 accent-primary`;
  return (
    <div className="space-y-2">
      {(q.options ?? []).map((o) => (
        <label key={o.id} className="flex cursor-pointer items-start gap-2.5 text-sm text-text-primary">
          <input
            type={multi ? "checkbox" : "radio"}
            name={q.id}
            className={`${box} mt-0.5`}
            checked={picked.has(o.id)}
            onChange={() => toggle(o.id)}
            disabled={disabled}
          />
          <span>{o.label}</span>
        </label>
      ))}
      {q.allowOther && (
        <div className="flex items-center gap-2.5 text-sm text-text-primary">
          <input
            type={multi ? "checkbox" : "radio"}
            name={q.id}
            className={box}
            checked={otherOn}
            onChange={() => setOther(multi && otherOn ? undefined : v.other ?? "")}
            aria-label="Other"
            disabled={disabled}
          />
          <span>Other:</span>
          <input
            type="text"
            className={`${input} py-1.5`}
            value={v.other ?? ""}
            maxLength={LIMITS.other}
            onChange={(e) => setOther(e.target.value)}
            onFocus={() => !otherOn && setOther(v.other ?? "")}
            aria-label={`${q.label}: other`}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

function Scale({
  q,
  value,
  onChange,
  disabled,
}: {
  q: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  disabled?: boolean;
}) {
  const min = q.min ?? 0;
  const max = q.max ?? 10;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.label}>
        {steps.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            disabled={disabled}
            onClick={() => onChange(value === n ? undefined : n)}
            className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition-colors ${
              value === n ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-primary hover:border-primary/60"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(q.minLabel || q.maxLabel) && (
        <div className="mt-1.5 flex justify-between gap-4 text-xs text-text-muted">
          <span>{q.minLabel && `${min} = ${q.minLabel}`}</span>
          <span>{q.maxLabel && `${max} = ${q.maxLabel}`}</span>
        </div>
      )}
    </div>
  );
}

function Field({
  q,
  value,
  onChange,
  disabled,
}: {
  q: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  disabled?: boolean;
}) {
  switch (q.type) {
    case "short_text":
      return (
        <input
          type="text"
          className={input}
          value={typeof value === "string" ? value : ""}
          maxLength={LIMITS.shortText}
          onChange={(e) => onChange(e.target.value)}
          aria-label={q.label}
          disabled={disabled}
        />
      );
    case "long_text":
      return (
        <textarea
          className={`${input} min-h-28`}
          value={typeof value === "string" ? value : ""}
          maxLength={LIMITS.longText}
          onChange={(e) => onChange(e.target.value)}
          aria-label={q.label}
          disabled={disabled}
        />
      );
    case "single_choice":
    case "multi_choice":
      return <ChoiceList q={q} value={value} onChange={onChange} disabled={disabled} />;
    case "dropdown": {
      const choice = value && typeof value === "object" && "choice" in value ? value.choice : "";
      return (
        <select
          className={input}
          value={choice}
          onChange={(e) => onChange(e.target.value ? { choice: e.target.value } : undefined)}
          aria-label={q.label}
          disabled={disabled}
        >
          <option value="">Choose...</option>
          {(q.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "yes_no":
      return (
        <div className="flex gap-2" role="radiogroup" aria-label={q.label}>
          {[true, false].map((b) => (
            <button
              key={String(b)}
              type="button"
              role="radio"
              aria-checked={value === b}
              disabled={disabled}
              onClick={() => onChange(value === b ? undefined : b)}
              className={`rounded-lg border px-5 py-2 text-sm font-medium transition-colors ${
                value === b ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-primary hover:border-primary/60"
              }`}
            >
              {b ? "Yes" : "No"}
            </button>
          ))}
        </div>
      );
    case "rating":
      return (
        <div className="flex gap-1" role="radiogroup" aria-label={q.label}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} of 5`}
              disabled={disabled}
              onClick={() => onChange(value === n ? undefined : n)}
              className="p-1 text-2xl text-amber-500"
            >
              <FiStar className={typeof value === "number" && n <= value ? "fill-current" : "text-text-muted"} aria-hidden />
            </button>
          ))}
        </div>
      );
    case "scale":
      return <Scale q={q} value={value} onChange={onChange} disabled={disabled} />;
    case "number":
      return (
        <input
          type="number"
          inputMode="decimal"
          className={`${input} max-w-48`}
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          min={q.min}
          max={q.max}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          aria-label={q.label}
          disabled={disabled}
        />
      );
  }
}

export function SurveyQuestions({
  questions,
  answers,
  errors = {},
  onChange,
  disabled,
}: {
  questions: SurveyQuestion[];
  answers: Answers;
  errors?: Record<string, string>;
  onChange: (id: string, value: AnswerValue | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <ol className="space-y-6">
      {questions.map((q, i) => (
        <li key={q.id} id={`q-${q.id}`}>
          <p className="font-medium text-text-primary">
            <span className="text-text-muted">{i + 1}. </span>
            {q.label || <span className="italic text-text-muted">Untitled question</span>}
            {q.required && (
              <span className="text-red-600 dark:text-red-400" aria-label="required">
                {" "}
                *
              </span>
            )}
          </p>
          {q.help && <p className="mt-0.5 whitespace-pre-line text-sm text-text-secondary">{q.help}</p>}
          <div className="mt-2.5">
            <Field q={q} value={answers[q.id]} onChange={(v) => onChange(q.id, v)} disabled={disabled} />
          </div>
          {errors[q.id] && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors[q.id]}</p>}
        </li>
      ))}
    </ol>
  );
}
