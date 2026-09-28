// components/layer2/math.tsx
// Text with LaTeX math, as used in typed questions and answers.
//
// Format: ordinary text with math between dollar signs, $x^2$ inline and
// $$\int_0^1 x\,dx$$ on its own line; \$ is a literal dollar. Text is
// rendered as React text (never HTML), and math through KaTeX + DOMPurify
// (lib/sanitize.ts), so a question can't inject markup.
"use client";

import "katex/dist/katex.min.css";
import { useRef, useState } from "react";
import { FormulaModal } from "@/components/editor/FormulaModal";
import { renderLatex } from "@/lib/sanitize";
import { useIsClient } from "@/hooks/useIsClient";
import { parseMathText } from "@/lib/mathText";

export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const isClient = useIsClient();
  return (
    <div className={`whitespace-pre-line break-words ${className}`}>
      {parseMathText(text).map((s, i) =>
        s.kind === "text" ? (
          <span key={i}>{s.value}</span>
        ) : isClient ? (
          <span
            key={i}
            role="math"
            aria-label={s.value}
            className={s.display ? "my-2 block overflow-x-auto text-center" : "inline-block max-w-full overflow-x-auto align-middle"}
            dangerouslySetInnerHTML={{ __html: renderLatex(s.value, s.display) }}
          />
        ) : (
          // Before KaTeX loads in the browser, show the source
          <code key={i} className="text-xs">
            {s.value}
          </code>
        ),
      )}
    </div>
  );
}

const DISPLAY_PREFIX = "\\displaystyle ";

/**
 * A textarea for math-enabled text: an "Insert formula" button (the shared
 * FormulaModal) that drops $…$ / $$…$$ in at the cursor, and a live preview.
 */
export function MathTextarea({
  label,
  value,
  onChange,
  maxLength,
  rows = 4,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);

  const insert = (formula: string) => {
    const display = formula.startsWith(DISPLAY_PREFIX);
    const latex = display ? formula.slice(DISPLAY_PREFIX.length) : formula;
    const snippet = display ? `\n$$${latex}$$\n` : `$${latex}$`;
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-text-secondary" htmlFor={`${label}-input`}>
          {label}
        </label>
        <button
          type="button"
          onClick={() => setFormulaOpen(true)}
          className="text-xs font-medium text-primary hover:underline"
        >
          ∑ Insert formula
        </button>
      </div>
      <textarea
        id={`${label}-input`}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <p className="text-[11px] text-text-muted">
        Math goes between dollar signs: $x^2$ inline, $$x^2$$ on its own line. \$ for a dollar sign.
      </p>
      {value.includes("$") && (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Preview</p>
          <MathText text={value} className="text-sm text-text-primary" />
        </div>
      )}
      {formulaOpen && <FormulaModal onClose={() => setFormulaOpen(false)} onInsert={(f) => insert(f)} />}
    </div>
  );
}
