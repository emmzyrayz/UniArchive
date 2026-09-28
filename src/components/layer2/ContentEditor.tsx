// components/layer2/ContentEditor.tsx
// Write or edit typed notes (a ContentDocument) with the shared BlockEditor
// (which has its own preview toggle and formula insertion). Work is kept as
// a local draft in this browser every 30 seconds; only "Publish" sends it
// to the server. An optional source textbook links the notes to the book
// they summarise.
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { CONTENT_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, LIMITS, type ContentDocumentType } from "@/lib/constants/layer2";
import { adminRequest, inputClass, primaryButton, secondaryButton, selectClass } from "@/components/admin/adminUi";
import type { ContentBlock } from "@/types/content";
import type { ContentDocumentDto } from "@/types/layer2";
import type { MaterialsResponse } from "@/types/unilibrary";

const DRAFT_SAVE_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

interface Draft {
  savedAt: string;
  documentType: ContentDocumentType;
  title: string;
  chapterNumber: string;
  chapterTitle: string;
  source: { id: string; title: string } | null;
  blocks: ContentBlock[];
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/** Words and characters of the text a reader sees (HTML tags stripped). */
function countText(blocks: ContentBlock[]): { words: number; chars: number } {
  const text = blocks
    .filter((b) => b.type !== "image")
    .map((b) => (b.type === "richText" ? b.content.replace(/<[^>]*>/g, " ") : b.content))
    .join(" ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return { words: text ? text.split(/\s+/).length : 0, chars: text.replace(/\s+/g, " ").length };
}

/** Search the UniLibrary's textbooks to link as the source. */
function SourceTextbookPicker({
  value,
  onChange,
  excludeId,
}: {
  value: { id: string; title: string } | null;
  onChange: (v: { id: string; title: string } | null) => void;
  excludeId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; by: string }[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/materials?category=BOOKS&limit=8&search=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<MaterialsResponse>) : null))
        .then((data) => {
          if (data) {
            setResults(
              data.materials
                .filter((m) => m._id !== excludeId)
                .map((m) => ({ id: m._id, title: m.title, by: m.submittedByUpid })),
            );
          }
        })
        .catch(() => {});
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, excludeId]);

  if (value) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-primary">
        📚 {value.title}
        <button type="button" onClick={() => onChange(null)} className="text-xs text-text-muted hover:text-red-600">
          Remove
        </button>
      </p>
    );
  }
  return (
    <div>
      <input
        type="search"
        className={inputClass}
        placeholder="Search textbooks in the UniLibrary…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search source textbook"
      />
      {query.trim().length >= 2 && results.length > 0 && (
        <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-text-primary">
                {r.title} <span className="text-text-muted">by @{r.by}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: r.id, title: r.title });
                  setQuery("");
                }}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ContentEditor({
  materialId,
  existing,
  onSaved,
  onCancel,
}: {
  materialId: string;
  existing?: ContentDocumentDto;
  onSaved: (doc: ContentDocumentDto) => void;
  onCancel: () => void;
}) {
  const draftKey = `uniarchive:notes-draft:${materialId}:${existing?.id ?? "new"}`;
  // Only offer a draft that's newer than what's published
  const [draft] = useState<Draft | null>(() => {
    const d = readDraft(draftKey);
    return d && (!existing || new Date(d.savedAt) > new Date(existing.updatedAt)) ? d : null;
  });
  const [draftOffered, setDraftOffered] = useState(!!draft);

  const [documentType, setDocumentType] = useState<ContentDocumentType>(existing?.documentType ?? "lecture_note");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [chapterNumber, setChapterNumber] = useState(existing?.chapterNumber !== undefined ? String(existing.chapterNumber) : "");
  const [chapterTitle, setChapterTitle] = useState(existing?.chapterTitle ?? "");
  const [source, setSource] = useState<{ id: string; title: string } | null>(
    existing?.sourceTextbook ? { id: existing.sourceTextbook.id, title: existing.sourceTextbook.title } : null,
  );
  const [blocks, setBlocks] = useState<ContentBlock[]>(existing?.contentBlocks ?? []);
  // Bumped to remount BlockEditor with restored blocks (it only reads them once)
  const [editorKey, setEditorKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the draft would hold right now; the timer saves it only if changed
  const snapshot = useMemo(
    () => JSON.stringify({ documentType, title, chapterNumber, chapterTitle, source, blocks }),
    [documentType, title, chapterNumber, chapterTitle, source, blocks],
  );
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let lastWritten = snapshotRef.current;
    const timer = setInterval(() => {
      if (snapshotRef.current === lastWritten) return;
      try {
        const savedAt = new Date().toISOString();
        window.localStorage.setItem(draftKey, JSON.stringify({ ...JSON.parse(snapshotRef.current), savedAt }));
        lastWritten = snapshotRef.current;
        setLastSaved(savedAt);
      } catch {
        // Storage full or blocked: the editor still works, just no draft
      }
    }, DRAFT_SAVE_MS);
    return () => clearInterval(timer);
  }, [draftKey]);

  const restoreDraft = () => {
    if (!draft) return;
    setDocumentType(draft.documentType);
    setTitle(draft.title);
    setChapterNumber(draft.chapterNumber);
    setChapterTitle(draft.chapterTitle);
    setSource(draft.source);
    setBlocks(draft.blocks);
    setEditorKey((k) => k + 1);
    setDraftOffered(false);
  };

  const { words, chars } = countText(blocks);

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        documentType,
        title,
        chapterNumber: chapterNumber === "" ? undefined : Number(chapterNumber),
        chapterTitle,
        sourceTextbookId: source?.id ?? null,
        contentBlocks: blocks,
      };
      const base = `/api/materials/${materialId}/content`;
      const { document } = await adminRequest<{ document: ContentDocumentDto }>(
        existing ? `${base}/${existing.id}` : base,
        existing ? "PATCH" : "POST",
        body,
      );
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Nothing to clean up
      }
      onSaved(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish.");
      setBusy(false);
    }
  };

  const fieldLabel = "block text-xs font-medium text-text-secondary";
  return (
    <form onSubmit={publish} className="space-y-4 rounded-xl border border-primary/30 bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-text-primary">{existing ? "Edit notes" : "Write typed notes"}</p>
        <p className="text-xs text-text-muted">
          {words.toLocaleString()} words · {chars.toLocaleString()} characters
          {lastSaved && ` · draft saved ${new Date(lastSaved).toLocaleTimeString()}`}
        </p>
      </div>

      {draftOffered && draft && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <span>You have an unpublished draft from {new Date(draft.savedAt).toLocaleString()}.</span>
          <span className="flex gap-3">
            <button type="button" onClick={restoreDraft} className="font-semibold underline">
              Restore it
            </button>
            <button type="button" onClick={() => setDraftOffered(false)} className="underline">
              Ignore
            </button>
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={fieldLabel}>
          Type
          <select className={`mt-1 w-full ${selectClass}`} value={documentType} onChange={(e) => setDocumentType(e.target.value as ContentDocumentType)}>
            {CONTENT_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Title
          <input className={`mt-1 ${inputClass}`} required maxLength={LIMITS.documentTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Chapter number (optional)
          <input type="number" min={0} max={1000} className={`mt-1 ${inputClass}`} value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Chapter title (optional)
          <input className={`mt-1 ${inputClass}`} maxLength={LIMITS.chapterTitle} value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} />
        </label>
      </div>

      <div>
        <p className={`${fieldLabel} mb-1`}>Source textbook (optional)</p>
        <SourceTextbookPicker value={source} onChange={setSource} excludeId={materialId} />
      </div>

      <BlockEditor key={editorKey} initialBlocks={blocks} onContentChange={setBlocks} />

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-text-muted">Drafts stay in this browser until you publish.</span>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !title.trim() || blocks.length === 0} className={primaryButton}>
          {busy ? "Publishing…" : existing ? "Publish changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}
