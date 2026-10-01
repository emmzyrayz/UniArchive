// components/mod/VerifyWorkspace.tsx
// The staff verify workspace (/mod/materials/verify/[id], also under
// /admin): the PDF on the right, the material form on the left. Fill in the
// details while reading, then publish it to the UniLibrary as UniArchive's
// and move straight on to the next file in the queue.
//
// Computer + fullscreen only (useDesktopFullscreen). Leaving fullscreen
// covers the workspace but keeps the form. While open, the file is claimed
// (renewed every few minutes) so nobody else works on it at the same time.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FiAlertTriangle, FiCheck, FiMaximize, FiMonitor } from "react-icons/fi";
import { useStaffArea } from "@/components/admin/staffArea";
import { formatFileSize } from "@/assets/data/libraryData";
import { useDesktopFullscreen } from "@/hooks/useDesktopFullscreen";
import { SUBMISSION_AUTOSAVE_MS } from "@/lib/constants/submissions";
import type { GiftDetailsDto, PlatformFileDto } from "@/lib/platformUploads";
import {
  AcademicFields,
  BasicsFields,
  EMPTY_MATERIAL_FORM,
  materialBody,
  validateAcademic,
  validateBasics,
  type MaterialFormErrors,
  type MaterialFormState,
} from "@/components/submit/materialFields";
import type { PdfDocument, PdfPaneHandle } from "./PdfPane";
import { OutlineEditor } from "./OutlineEditor";
import { outlineKindFor, parseOutline, type OutlineEntry } from "@/lib/outline";
import { extractPdfOutline, type OutlineSource } from "@/lib/pdfOutline";

// pdf.js only runs in the browser
const PdfPane = dynamic(() => import("./PdfPane"), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-sm text-text-muted">Loading viewer…</p>,
});

const CLAIM_RENEW_MS = 10 * 60 * 1000;

interface FileDetail {
  file: PlatformFileDto;
  fileUrl: string | null;
  draft: Record<string, unknown> | null;
  gift: GiftDetailsDto | null;
}

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; detail: FileDetail }
  | { kind: "blocked"; message: string } // claimed by someone else, published, gone
  | { kind: "empty" }; // nothing left in the queue

/**
 * A saved draft merged over the defaults, ignoring anything malformed. For a
 * gift, the defaults are what the student told us: their note as the
 * description and their school and level.
 */
function formFromDraft(
  draft: Record<string, unknown> | null,
  file: PlatformFileDto,
  gift: GiftDetailsDto | null,
): MaterialFormState {
  const base: MaterialFormState = {
    ...EMPTY_MATERIAL_FORM,
    title: file.title.slice(0, 200),
    ...(gift
      ? {
          description: gift.note.slice(0, 2000),
          university: gift.university ?? null,
          faculty: gift.faculty ?? null,
          department: gift.department ?? null,
          level: gift.level ?? "",
          semester: gift.semester ?? "",
        }
      : {}),
  };
  if (!draft) return base;
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof MaterialFormState)[]) {
    const value = draft[key];
    const expected = base[key];
    if (value === undefined) continue;
    if (key === "university" || key === "faculty" || key === "department") {
      const ref = value as { id?: unknown; name?: unknown } | null;
      out[key] = ref && typeof ref.id === "string" && typeof ref.name === "string" ? { id: ref.id, name: ref.name } : null;
    } else if (Array.isArray(expected)) {
      out.tags = Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : [];
    } else if (typeof value === "string") {
      (out as unknown as Record<string, string>)[key] = value;
    }
  }
  return out;
}

/** Outline entries from a saved draft, dropping anything malformed. */
function outlineFromDraft(draft: Record<string, unknown> | null): OutlineEntry[] {
  const raw = (draft?.outline as unknown[]) ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    const entry = e as Partial<OutlineEntry>;
    if (!entry || typeof entry.title !== "string" || ![1, 2, 3].includes(entry.level as number)) return [];
    return [
      {
        title: entry.title,
        level: entry.level as OutlineEntry["level"],
        ...(Number.isInteger(entry.page) ? { page: entry.page } : {}),
        ...(typeof entry.pageLabel === "string" ? { pageLabel: entry.pageLabel } : {}),
      },
    ];
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message?: string } }> {
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  return { ok: res.ok, status: res.status, data };
}

export function VerifyWorkspace({ initialId, isAdmin }: { initialId: string; isAdmin: boolean }) {
  const { base } = useStaffArea();
  const rootRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PdfPaneHandle>(null);
  const { isDesktop, isFullscreen, supported, enterFullscreen } = useDesktopFullscreen(rootRef);

  const [started, setStarted] = useState(false);
  const [fileId, setFileId] = useState(initialId);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [form, setForm] = useState<MaterialFormState>(EMPTY_MATERIAL_FORM);
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [errors, setErrors] = useState<MaterialFormErrors>({});
  const [busy, setBusy] = useState<null | "publish" | "draft" | "discard" | "skip">(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [publishedCount, setPublishedCount] = useState(0);

  const snapshot = JSON.stringify({ form, outline });
  const dirty = phase.kind === "ready" && snapshot !== savedSnapshot;
  const detail = phase.kind === "ready" ? phase.detail : null;

  // Claim and load the current file (once the reviewer has started)
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    (async () => {
      const claim = await request<{ claimedByUpid?: string }>(`/api/mod/uploads/${fileId}/claim`, { method: "POST" });
      if (cancelled) return;
      if (!claim.ok) {
        setPhase({ kind: "blocked", message: claim.data.message ?? "This file can't be opened right now." });
        return;
      }
      const res = await request<FileDetail>(`/api/mod/uploads/${fileId}`);
      if (cancelled) return;
      if (!res.ok) {
        setPhase({ kind: "blocked", message: res.data.message ?? "This file can't be opened right now." });
        return;
      }
      const initial = formFromDraft(res.data.draft, res.data.file, res.data.gift);
      const initialOutline = outlineFromDraft(res.data.draft);
      setForm(initial);
      setOutline(initialOutline);
      setOutlineError(null);
      pdfDocRef.current = null;
      setSavedSnapshot(JSON.stringify({ form: initial, outline: initialOutline }));
      setErrors({});
      setNumPages(0);
      setCurrentPage(1);
      setPhase({ kind: "ready", detail: res.data });
    })();

    const renew = setInterval(() => {
      void fetch(`/api/mod/uploads/${fileId}/claim`, { method: "POST", credentials: "same-origin" });
    }, CLAIM_RENEW_MS);
    const release = () =>
      fetch(`/api/mod/uploads/${fileId}/claim`, { method: "DELETE", credentials: "same-origin", keepalive: true });
    window.addEventListener("pagehide", release);
    return () => {
      cancelled = true;
      clearInterval(renew);
      window.removeEventListener("pagehide", release);
      void release();
    };
  }, [started, fileId]);

  // Keep the URL on the file being worked on, without remounting the page
  useEffect(() => {
    const path = `${base}/materials/verify/${fileId}`;
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, [base, fileId]);

  const update = useCallback(<K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setMessage(null);
  }, []);

  const saveDraft = useCallback(
    async (silent = false) => {
      const sent = JSON.stringify({ form, outline });
      const res = await request<{ savedAt: string }>(`/api/mod/uploads/${fileId}/draft`, {
        method: "PUT",
        body: JSON.stringify({ draft: { ...form, outline } }),
      });
      if (res.ok) {
        setSavedSnapshot(sent);
        if (!silent) setMessage({ text: "Draft saved.", ok: true });
      } else if (!silent) {
        setMessage({ text: res.data.message ?? "Couldn't save the draft.", ok: false });
      }
      return res.ok;
    },
    [fileId, form, outline],
  );

  // Auto-save every minute while there are unsaved changes
  const saveRef = useRef(saveDraft);
  useEffect(() => {
    saveRef.current = saveDraft;
  });
  useEffect(() => {
    if (!dirty || busy) return;
    const timer = setInterval(() => void saveRef.current(true), SUBMISSION_AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [dirty, busy]);

  const scope = detail?.file.source === "gift" ? "gifts" : isAdmin ? "all" : "mine";

  /** The next pending file nobody else is working on, or null. */
  const findNext = async (): Promise<string | null> => {
    const res = await request<{ files: PlatformFileDto[] }>(`/api/mod/uploads?scope=${scope}&status=pending`);
    if (!res.ok) return null;
    const next = res.data.files.find((f) => f.id !== fileId && (!f.claim || f.claim.mine));
    return next?.id ?? null;
  };

  const goTo = (nextId: string | null) => {
    setConfirmDiscard(false);
    if (nextId) {
      setPhase({ kind: "loading" });
      setFileId(nextId);
    } else {
      // Staying on this file id, so the claim effect won't release it: do it
      // here (publish and discard already cleared it server-side)
      void fetch(`/api/mod/uploads/${fileId}/claim`, { method: "DELETE", credentials: "same-origin" });
      setPhase({ kind: "empty" });
    }
  };

  const outlineKind = outlineKindFor(form.subcategory);

  const publish = async () => {
    const found = { ...validateBasics(form), ...validateAcademic(form) };
    setErrors(found);
    // Same rules the server applies; only types with an outline send one
    const checkedOutline = outlineKind
      ? parseOutline({ entries: outline }, form.subcategory, numPages || detail?.file.pageCount)
      : ({ ok: true, value: null } as const);
    setOutlineError(checkedOutline.ok ? null : checkedOutline.message);
    if (Object.keys(found).length || !checkedOutline.ok) {
      setMessage({ text: "Fill in the highlighted fields first.", ok: false });
      return;
    }
    setBusy("publish");
    setMessage(null);
    const res = await request<{ materialId: string; nextId: string | null }>(`/api/mod/uploads/${fileId}/publish`, {
      method: "POST",
      body: JSON.stringify({
        ...materialBody(form),
        ...(numPages ? { pageCount: numPages } : {}),
        ...(checkedOutline.value ? { outline: { entries: checkedOutline.value.entries } } : {}),
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setMessage({ text: res.data.message ?? "Couldn't publish this file.", ok: false });
      return;
    }
    setPublishedCount((n) => n + 1);
    setMessage({ text: `Published "${form.title.trim()}".`, ok: true });
    goTo(res.data.nextId);
  };

  const skip = async () => {
    setBusy("skip");
    if (dirty) await saveDraft(true);
    const next = await findNext();
    setBusy(null);
    setMessage(null);
    goTo(next);
  };

  const discard = async () => {
    setBusy("discard");
    const res = await request(`/api/mod/uploads/${fileId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(null);
      setMessage({ text: res.data.message ?? "Couldn't discard this file.", ok: false });
      return;
    }
    const next = await findNext();
    setBusy(null);
    setMessage({ text: "File discarded.", ok: true });
    goTo(next);
  };

  const start = async () => {
    const ok = await enterFullscreen();
    if (ok) setStarted(true);
  };

  // --- Gate: computer + fullscreen -------------------------------------------------
  const gate = !isDesktop ? (
    <div className="max-w-md space-y-3 text-center">
      <FiMonitor aria-hidden className="mx-auto h-10 w-10 text-text-muted" />
      <h1 className="text-xl font-bold text-text-primary">Open this on a computer</h1>
      <p className="text-sm text-text-secondary">
        Verifying materials needs a computer with a mouse or trackpad and a screen at least 1280
        pixels wide. Phones and tablets, even in desktop mode, can&apos;t open the workspace.
      </p>
      <Link href={`${base}/materials/queue`} className="inline-block text-sm text-primary hover:underline">
        Back to the queue
      </Link>
    </div>
  ) : !supported ? (
    <p className="text-sm text-text-secondary">This browser can&apos;t go fullscreen. Try Chrome, Edge or Firefox.</p>
  ) : (
    <div className="max-w-md space-y-4 text-center">
      <FiMaximize aria-hidden className="mx-auto h-10 w-10 text-text-muted" />
      <h1 className="text-xl font-bold text-text-primary">
        {started ? "You left fullscreen" : "The workspace opens in fullscreen"}
      </h1>
      <p className="text-sm text-text-secondary">
        {started
          ? "Your form is just as you left it. Go back to fullscreen to carry on."
          : "The PDF goes on the right and the details form on the left. Press Esc any time to step out."}
      </p>
      <button
        type="button"
        onClick={() => void start()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {started ? "Return to fullscreen" : "Enter fullscreen"}
      </button>
      <div>
        <Link href={`${base}/materials/queue`} className="text-sm text-text-secondary hover:text-text-primary">
          Back to the queue
        </Link>
      </div>
    </div>
  );

  const showWorkspace = started && isDesktop && isFullscreen;

  return (
    <div
      ref={rootRef}
      className={`relative bg-background ${showWorkspace ? "h-screen w-screen" : "mt-[70px] min-h-[calc(100vh-70px)]"}`}
    >
      {!showWorkspace && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6">{gate}</div>
      )}

      {started && (
        <div className={`flex h-full ${showWorkspace ? "" : "invisible h-0 overflow-hidden"}`}>
          <aside className="flex w-[40%] min-w-[380px] max-w-[640px] flex-col border-r border-border bg-surface-raised">
            <header className="border-b border-border px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`${base}/materials/queue`} className="text-sm text-text-secondary hover:text-text-primary">
                  ← Queue
                </Link>
                {publishedCount > 0 && (
                  <span className="text-xs text-success">{publishedCount} published this session</span>
                )}
              </div>
              {detail && (
                <div className="mt-2">
                  <p className="truncate text-sm font-semibold text-text-primary" title={detail.file.originalFileName}>
                    {detail.file.originalFileName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(detail.file.fileSize)}
                    {(numPages || detail.file.pageCount) && ` · ${numPages || detail.file.pageCount} pages`}
                    {` · uploaded by @${detail.file.uploadedByUpid}`}
                    {detail.file.source === "gift" && " · gifted"}
                  </p>
                  {detail.gift && (
                    <p className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary">
                      <span className="font-medium text-text-primary">Gifted with this note: </span>
                      {detail.gift.note}
                    </p>
                  )}
                </div>
              )}
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {phase.kind === "loading" && <p className="text-sm text-text-muted">Loading file…</p>}
              {phase.kind === "blocked" && (
                <div className="space-y-3">
                  <p className="flex gap-2 text-sm text-text-primary">
                    <FiAlertTriangle aria-hidden className="mt-0.5 shrink-0 text-warning" /> {phase.message}
                  </p>
                  <button type="button" onClick={() => void skip()} className="text-sm text-primary hover:underline">
                    Go to the next file
                  </button>
                </div>
              )}
              {phase.kind === "empty" && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-semibold text-text-primary">
                    <FiCheck aria-hidden className="text-success" /> The queue is empty
                  </p>
                  <p className="text-sm text-text-secondary">Every file you can work on has been handled.</p>
                  <div className="flex gap-4 text-sm">
                    <Link href={`${base}/materials/upload`} className="text-primary hover:underline">
                      Upload more
                    </Link>
                    <Link href={`${base}/materials/queue`} className="text-primary hover:underline">
                      Open the queue
                    </Link>
                  </div>
                </div>
              )}
              {phase.kind === "ready" && (
                <>
                  <BasicsFields form={form} errors={errors} update={update} idPrefix="verify" />
                  <AcademicFields form={form} errors={errors} update={update} setForm={setForm} idPrefix="verify" />
                  {outlineKind ? (
                    <OutlineEditor
                      kind={outlineKind}
                      entries={outline}
                      onChange={(next) => {
                        setOutline(next);
                        setOutlineError(null);
                      }}
                      currentPage={numPages ? currentPage : undefined}
                      pageCount={numPages || detail?.file.pageCount}
                      onImport={
                        numPages
                          ? () =>
                              pdfDocRef.current
                                ? extractPdfOutline(pdfDocRef.current as unknown as OutlineSource)
                                : Promise.resolve([])
                          : undefined
                      }
                      onJump={(page) => pdfRef.current?.goToPage(page)}
                      error={outlineError}
                    />
                  ) : (
                    <p className="text-xs text-text-muted">
                      Set the type to E-book / Textbook, E-books or Course Materials to add a table of
                      contents, or to Lecture Notes, Syllabus or Tutorial to add a course outline.
                    </p>
                  )}
                </>
              )}
            </div>

            {phase.kind === "ready" && (
              <footer className="space-y-3 border-t border-border px-5 py-3">
                {message && (
                  <p role="status" className={`text-sm ${message.ok ? "text-success" : "text-error"}`}>
                    {message.text}
                  </p>
                )}
                {confirmDiscard ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-sm text-text-primary">Delete this PDF from storage?</span>
                    <button
                      type="button"
                      onClick={() => void discard()}
                      disabled={busy !== null}
                      className="rounded-lg bg-error px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === "discard" ? "Discarding…" : "Yes, discard"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(false)}
                      disabled={busy !== null}
                      className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(true)}
                      disabled={busy !== null}
                      className="rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void skip()}
                      disabled={busy !== null}
                      className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                      {busy === "skip" ? "Finding next…" : "Skip"}
                    </button>
                    <span className="mr-auto text-xs text-text-muted" aria-live="polite">
                      {dirty ? "Unsaved changes" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void saveDraft()}
                      disabled={busy !== null || !dirty}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-surface disabled:opacity-50"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void publish()}
                      disabled={busy !== null}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy === "publish" ? "Publishing…" : "Publish & next"}
                    </button>
                  </div>
                )}
              </footer>
            )}
          </aside>

          <section className="min-w-0 flex-1" aria-label="PDF">
            {detail?.fileUrl ? (
              <PdfPane
                ref={pdfRef}
                url={detail.fileUrl}
                onNumPages={setNumPages}
                onDocument={(pdf) => {
                  pdfDocRef.current = pdf;
                }}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                {phase.kind === "loading" ? "Loading…" : "No PDF to show."}
              </div>
            )}
          </section>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {phase.kind === "ready" ? `Page ${currentPage} of ${numPages}` : ""}
      </span>
    </div>
  );
}
