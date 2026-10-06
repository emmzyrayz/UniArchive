// components/conversions/NoteDraftEditor.tsx
// Writing (or editing) typed notes in the conversion workspace, with the
// shared BlockEditor. The note is autosaved in the draft; "Publish" sends
// it. A new note carries an Idempotency-Key (a retry can't publish it
// twice); an edit carries the note's updatedAt from when editing started,
// so someone else's changes made meanwhile aren't silently overwritten.
"use client";

import { useState } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { SourceTextbookPicker } from "@/components/layer2/ContentEditor";
import { CONTENT_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, LIMITS, type ContentDocumentType } from "@/lib/constants/layer2";
import { IDEMPOTENCY_HEADER, countWords, emptyPayload, type DraftNote } from "@/lib/conversions";
import type { DraftSession, DraftState } from "@/lib/draftSync";
import { inputClass, primaryButton, selectClass } from "@/components/admin/adminUi";
import type { ContentBlock } from "@/types/content";
import type { ContentDocumentDto } from "@/types/layer2";

const noteOf = (state: DraftState): DraftNote =>
  "note" in state.payload ? state.payload.note : (emptyPayload("note") as { note: DraftNote }).note;

const fromDocument = (doc: ContentDocumentDto): DraftNote => ({
  documentType: doc.documentType,
  title: doc.title,
  ...(doc.chapterNumber !== undefined ? { chapterNumber: doc.chapterNumber } : {}),
  ...(doc.chapterTitle ? { chapterTitle: doc.chapterTitle } : {}),
  contentBlocks: doc.contentBlocks,
  source: doc.sourceTextbook ? { id: doc.sourceTextbook.id, title: doc.sourceTextbook.title } : null,
});

export function NoteDraftEditor({
  session,
  state,
  materialId,
  editing,
  onFinished,
}: {
  session: DraftSession;
  state: DraftState;
  materialId: string;
  /** The published note being edited (its current version) */
  editing?: ContentDocumentDto;
  onFinished: (docId: string) => void;
}) {
  const note = noteOf(state);
  const readOnly = state.readOnly;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ContentDocumentDto | null>(null);
  // After "Load their version", edits build on that version
  const [baseOverride, setBaseOverride] = useState<string | null>(null);
  // Remounts BlockEditor when the blocks change from outside it (it reads them once)
  const [loadedVersion, setLoadedVersion] = useState(0);

  const set = (patch: Partial<DraftNote>) => session.update({ note: { ...noteOf(session.getSnapshot()), ...patch } });
  // An edit draft made before the source was tracked: show the published one
  const source = note.source !== undefined ? note.source : editing?.sourceTextbook ? { id: editing.sourceTextbook.id, title: editing.sourceTextbook.title } : null;
  const words = countWords(note.title) + note.contentBlocks.reduce((n, b) => n + (b.type === "image" ? 0 : countWords(b.content)), 0);

  const body = () => ({
    documentType: note.documentType,
    title: note.title,
    chapterNumber: note.chapterNumber === undefined || note.chapterNumber === "" ? undefined : Number(note.chapterNumber),
    chapterTitle: note.chapterTitle ?? "",
    contentBlocks: note.contentBlocks,
    ...(note.source !== undefined ? { sourceTextbookId: note.source?.id ?? null } : {}),
  });

  const send = async (url: string, method: "POST" | "PATCH", payload: object, headers: Record<string, string> = {}) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { document?: ContentDocumentDto; message?: string; conflict?: boolean };
      return { status: res.status, data };
    } catch {
      return null;
    }
  };

  const publish = async (overwriteBase?: string) => {
    setBusy(true);
    setError(null);
    try {
      // Make sure the latest text is in the draft (and the draft exists) first
      await session.syncNow();
      let result;
      if (editing) {
        const base = overwriteBase ?? baseOverride ?? state.baseDocUpdatedAt;
        result = await send(`/api/materials/${materialId}/content/${editing.id}`, "PATCH", {
          ...body(),
          ...(base ? { baseUpdatedAt: base } : {}),
        });
      } else {
        const draftId = session.getSnapshot().draftId;
        if (!draftId) {
          setError("Couldn't reach the server. Your note is saved on this device; publish it when you're online.");
          return;
        }
        result = await send(`/api/materials/${materialId}/content`, "POST", body(), { [IDEMPOTENCY_HEADER]: `note:${draftId}` });
      }
      if (!result) {
        setError("No connection. Your note is saved; publish it when you're back online.");
        return;
      }
      if (result.status === 409 && result.data.conflict && result.data.document) {
        setConflict(result.data.document);
        return;
      }
      if (result.status === 401) {
        setError("You've been signed out. Sign in again to publish (your note is saved here).");
        return;
      }
      if (result.status >= 300 || !result.data.document) {
        setError(result.data.message ?? `Couldn't publish (HTTP ${result.status}).`);
        return;
      }
      const docId = result.data.document.id;
      await session.finish();
      onFinished(docId);
    } finally {
      setBusy(false);
    }
  };

  const loadTheirs = () => {
    if (!conflict) return;
    session.update({ note: fromDocument(conflict) });
    setBaseOverride(conflict.updatedAt);
    setLoadedVersion((v) => v + 1);
    setConflict(null);
  };

  const fieldLabel = "block text-xs font-medium text-text-secondary";
  const canPublish = !readOnly && !busy && note.title.trim() && note.contentBlocks.length > 0;

  return (
    <div className="space-y-4 p-4">
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabel}>
          Type
          <select
            className={`mt-1 w-full ${selectClass}`}
            value={note.documentType}
            onChange={(e) => set({ documentType: e.target.value as ContentDocumentType })}
          >
            {CONTENT_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Title
          <input className={`mt-1 ${inputClass}`} maxLength={LIMITS.documentTitle} value={note.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className={fieldLabel}>
          Chapter number (optional)
          <input
            type="number"
            min={0}
            max={1000}
            className={`mt-1 ${inputClass}`}
            value={note.chapterNumber ?? ""}
            onChange={(e) => set({ chapterNumber: e.target.value })}
          />
        </label>
        <label className={fieldLabel}>
          Chapter title (optional)
          <input className={`mt-1 ${inputClass}`} maxLength={LIMITS.chapterTitle} value={note.chapterTitle ?? ""} onChange={(e) => set({ chapterTitle: e.target.value })} />
        </label>
        <div className="sm:col-span-2">
          <p className={`${fieldLabel} mb-1`}>Source textbook (optional)</p>
          <SourceTextbookPicker value={source} onChange={(v) => set({ source: v })} excludeId={materialId} />
        </div>
      </fieldset>

      <div className={readOnly ? "pointer-events-none opacity-70" : ""} aria-disabled={readOnly}>
        <BlockEditor
          key={`${state.externalVersion}:${loadedVersion}`}
          initialBlocks={note.contentBlocks as ContentBlock[]}
          onContentChange={(blocks) => set({ contentBlocks: blocks })}
        />
      </div>

      {conflict && (
        <div role="alert" className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary">
          <p>
            Someone changed this note after you started editing
            {conflict.lastEditedAt ? ` (${new Date(conflict.lastEditedAt).toLocaleString()})` : ""}. Publishing yours would
            replace their changes.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={loadTheirs} className="font-semibold text-primary hover:underline">
              Load their version
            </button>
            <button type="button" onClick={() => { const base = conflict.updatedAt; setConflict(null); void publish(base); }} className="font-semibold text-error hover:underline">
              Publish mine anyway
            </button>
            <button type="button" onClick={() => setConflict(null)} className="hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">{words.toLocaleString()} words</span>
        <button type="button" onClick={() => void publish()} disabled={!canPublish} className={`${primaryButton} ml-auto`}>
          {busy ? "Publishing…" : editing ? "Publish changes" : "Publish"}
        </button>
      </div>
    </div>
  );
}
