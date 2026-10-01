// components/mod/OutlineEditor.tsx
// Edits a material's table of contents or course outline next to its PDF:
// import the PDF's own bookmarks, add entries, indent / outdent (three
// levels), reorder, delete, and set an entry's page to the page in view.
// The rules are lib/outline.ts's; the server checks them again.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronLeft,
  FiChevronRight,
  FiCornerDownRight,
  FiDownload,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import {
  OUTLINE_LABELS,
  OUTLINE_LIMITS,
  normalizeLevels,
  type OutlineEntry,
  type OutlineKind,
} from "@/lib/outline";

interface Props {
  kind: OutlineKind;
  entries: OutlineEntry[];
  onChange: (entries: OutlineEntry[]) => void;
  /** The page currently in view in the PDF, for "use this page". */
  currentPage?: number;
  pageCount?: number;
  /** Reads the PDF's bookmarks; omitted when the PDF isn't loaded. */
  onImport?: () => Promise<OutlineEntry[]>;
  /** Scrolls the PDF to a page. */
  onJump?: (page: number) => void;
  error?: string | null;
}

const iconButton =
  "rounded p-1 text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent";

export function OutlineEditor({ kind, entries, onChange, currentPage, pageCount, onImport, onJump, error }: Props) {
  const labels = OUTLINE_LABELS[kind];
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const full = entries.length >= OUTLINE_LIMITS.entries;
  // Row whose title should get focus once it has rendered (after Enter / Add)
  const focusRow = useRef<number | null>(null);
  useEffect(() => {
    if (focusRow.current === null) return;
    document.getElementById(`outline-title-${focusRow.current}`)?.focus();
    focusRow.current = null;
  }, [entries]);

  const set = (next: OutlineEntry[]) => onChange(normalizeLevels(next));
  const patch = (i: number, changes: Partial<OutlineEntry>) =>
    set(entries.map((e, j) => (j === i ? { ...e, ...changes } : e)));

  const insertAfter = (i: number) => {
    if (full) return;
    const level = i >= 0 ? entries[i].level : 1;
    const entry: OutlineEntry = {
      title: "",
      level,
      ...(currentPage ? { page: currentPage } : {}),
    };
    focusRow.current = i + 1;
    set([...entries.slice(0, i + 1), entry, ...entries.slice(i + 1)]);
  };

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  const runImport = async () => {
    if (!onImport) return;
    setImporting(true);
    setNotice(null);
    try {
      const imported = await onImport();
      if (imported.length === 0) {
        setNotice("This PDF has no bookmarks to import. Add the entries by hand.");
      } else {
        set(imported);
        setNotice(`Imported ${imported.length} entr${imported.length === 1 ? "y" : "ies"} from the PDF's bookmarks. Check the titles and pages.`);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="outline-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="outline-heading" className="text-sm font-medium text-text-secondary">
          {labels.title} <span className="font-normal text-text-muted">(optional · {entries.length}/{OUTLINE_LIMITS.entries})</span>
        </h2>
        {onImport && (
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface disabled:opacity-50"
          >
            <FiDownload aria-hidden /> {importing ? "Reading bookmarks…" : "Import PDF bookmarks"}
          </button>
        )}
      </div>
      <p className="text-xs text-text-muted">
        {kind === "toc"
          ? "Each entry points at the PDF page it starts on. Use the arrows to nest sections under chapters."
          : "Weeks or modules at the top level, topics under them. Pages are optional."}
      </p>

      {notice && <p className="text-xs text-text-secondary">{notice}</p>}

      {entries.length > 0 && (
        <ol className="space-y-1.5">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-center gap-1.5" style={{ paddingLeft: (entry.level - 1) * 18 }}>
              <span className="w-5 shrink-0 text-right text-[10px] text-text-muted" title={labels.levels[entry.level - 1]}>
                {entry.level === 1 ? "" : <FiCornerDownRight aria-hidden className="inline" />}
              </span>
              <label htmlFor={`outline-title-${i}`} className="sr-only">
                {labels.levels[entry.level - 1]} {i + 1} title
              </label>
              <input
                id={`outline-title-${i}`}
                value={entry.title}
                maxLength={OUTLINE_LIMITS.title}
                placeholder={labels.levels[entry.level - 1]}
                onChange={(e) => patch(i, { title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertAfter(i);
                  }
                }}
                className={`min-w-0 flex-1 rounded border bg-surface px-2 py-1 text-sm text-text-primary ${
                  entry.level === 1 ? "font-medium" : ""
                } ${entry.title.trim() ? "border-border" : "border-error/60"}`}
              />
              <label htmlFor={`outline-page-${i}`} className="sr-only">
                Page
              </label>
              <input
                id={`outline-page-${i}`}
                inputMode="numeric"
                value={entry.page ?? ""}
                placeholder="p."
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  patch(i, { page: digits ? Number(digits) : undefined });
                }}
                className={`w-14 rounded border bg-surface px-1.5 py-1 text-center text-sm text-text-primary ${
                  (kind === "toc" && !entry.page) || (entry.page && pageCount && entry.page > pageCount)
                    ? "border-error/60"
                    : "border-border"
                }`}
              />
              <div className="flex shrink-0 items-center">
                {currentPage !== undefined && (
                  <button
                    type="button"
                    onClick={() => patch(i, { page: currentPage })}
                    title={`Use the page in view (${currentPage})`}
                    aria-label={`Set entry ${i + 1} to page ${currentPage}`}
                    className={`${iconButton} text-[10px] font-semibold`}
                  >
                    p{currentPage}
                  </button>
                )}
                {onJump && entry.page && (
                  <button type="button" onClick={() => onJump(entry.page!)} title="Show this page" aria-label={`Show page ${entry.page}`} className={iconButton}>
                    <FiChevronRight aria-hidden className="rotate-90" />
                  </button>
                )}
                <button type="button" onClick={() => patch(i, { level: (entry.level - 1) as 1 | 2 | 3 })} disabled={entry.level === 1} title="Outdent" aria-label={`Outdent entry ${i + 1}`} className={iconButton}>
                  <FiChevronLeft aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => patch(i, { level: (entry.level + 1) as 1 | 2 | 3 })}
                  disabled={entry.level === 3 || i === 0 || entries[i - 1].level < entry.level}
                  title="Indent"
                  aria-label={`Indent entry ${i + 1}`}
                  className={iconButton}
                >
                  <FiChevronRight aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" aria-label={`Move entry ${i + 1} up`} className={iconButton}>
                  <FiArrowUp aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === entries.length - 1} title="Move down" aria-label={`Move entry ${i + 1} down`} className={iconButton}>
                  <FiArrowDown aria-hidden />
                </button>
                <button type="button" onClick={() => set(entries.filter((_, j) => j !== i))} title="Delete" aria-label={`Delete entry ${i + 1}`} className={`${iconButton} hover:text-error`}>
                  <FiTrash2 aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => insertAfter(entries.length - 1)}
          disabled={full}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:text-text-muted disabled:no-underline"
        >
          <FiPlus aria-hidden /> Add {entries.length ? "entry" : labels.levels[0].toLowerCase()}
        </button>
        {entries.length > 0 && (
          <span className="text-xs text-text-muted">Enter in a title adds the next entry.</span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}
