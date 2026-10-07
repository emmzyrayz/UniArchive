// components/drive/DriveImportDialog.tsx
// "Import from Google Drive", two ways in:
//  - From my Drive: Google's Picker (lib/drive/picker.ts), several PDFs at
//    once, with a short-lived drive.file token that only opens what's picked
//  - From a link: a folder or file shared "Anyone with the link", listed by
//    POST /api/drive/scan, then Select all
// The chosen PDFs are imported one at a time (two in parallel) through
// POST /api/drive/import, server to server, so the person's data is only
// used to choose. target "library" adds them to the person's library;
// "platform" (staff) to the upload queue. Each tab shows only when its
// Google keys are set (GET /api/drive/config).
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiCopy, FiFolder, FiX } from "react-icons/fi";
import { formatFileSize } from "@/assets/data/libraryData";
import { parseDriveUrl } from "@/lib/drive/urls";
import { pickDriveFiles, requestDriveToken, type PickerConfig } from "@/lib/drive/picker";

const CONCURRENCY = 2;
/** Most files one run imports (the daily limit for students is 100). */
const MAX_PER_RUN = 100;

interface ScanFile {
  id: string;
  name: string;
  size?: number;
  resourceKey?: string;
  folderPath: string;
  importedBefore: boolean;
}
interface Scan {
  kind: "folder" | "file" | "picked";
  name: string;
  truncated: boolean;
  files: ScanFile[];
}
type ItemStatus = "waiting" | "importing" | "imported" | "duplicate" | "failed";
interface Item {
  file: ScanFile;
  status: ItemStatus;
  message?: string;
}

const STATUS: Record<ItemStatus, string> = {
  waiting: "Waiting",
  importing: "Importing…",
  imported: "Imported",
  duplicate: "Already have it",
  failed: "Failed",
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `Request failed (HTTP ${res.status}).`);
  return data;
}

interface Props {
  target: "library" | "platform";
  onClose: () => void;
  /** Called once a run ends, with how many files were imported. */
  onImported?: (count: number) => void;
}

export function DriveImportDialog({ target, onClose, onImported }: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<Item[] | null>(null);
  const stopRef = useRef(false);
  // The Picker's token, for importing what was picked (never stored)
  const tokenRef = useRef<string | null>(null);
  const [config, setConfig] = useState<{ picker: PickerConfig | null; links: boolean } | null>(null);
  const [mode, setMode] = useState<"drive" | "link">("drive");
  const [picking, setPicking] = useState(false);
  const running = items?.some((i) => i.status === "waiting" || i.status === "importing") ?? false;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/drive/config", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { picker: null, links: false }))
      .then((c: { picker: PickerConfig | null; links: boolean }) => {
        if (cancelled) return;
        setConfig(c);
        if (!c.picker) setMode("link");
      })
      .catch(() => !cancelled && setConfig({ picker: null, links: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !running && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, onClose]);

  const doPick = async () => {
    if (!config?.picker) return;
    setError(null);
    setPicking(true);
    try {
      const token = await requestDriveToken(config.picker);
      const picked = await pickDriveFiles(config.picker, token, MAX_PER_RUN);
      if (!picked) return;
      if (picked.length === 0) {
        setError("Only PDFs can be imported. Pick PDF files.");
        return;
      }
      tokenRef.current = token;
      setScan({
        kind: "picked",
        name: "From your Google Drive",
        truncated: false,
        files: picked.map((f) => ({ ...f, folderPath: "", importedBefore: false })),
      });
      setSelected(new Set(picked.map((f) => f.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open Google Drive.");
    } finally {
      setPicking(false);
    }
  };

  const doScan = async () => {
    setError(null);
    tokenRef.current = null;
    if (!parseDriveUrl(url)) {
      setError("That isn't a Google Drive link. In Drive, use Share > Copy link, and paste it here.");
      return;
    }
    setScanning(true);
    try {
      const result = await post<Scan>("/api/drive/scan", { url, target });
      if (result.files.length === 0) {
        setError(result.kind === "folder" ? `There are no PDFs in "${result.name}".` : "No PDFs found.");
        return;
      }
      setScan(result);
      setSelected(new Set(result.files.filter((f) => !f.importedBefore).slice(0, MAX_PER_RUN).map((f) => f.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that link.");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PER_RUN) next.add(id);
      return next;
    });
  const allIds = scan?.files.map((f) => f.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.slice(0, MAX_PER_RUN).every((id) => selected.has(id));

  const runImport = async () => {
    if (!scan) return;
    const queue = scan.files.filter((f) => selected.has(f.id));
    const list: Item[] = queue.map((file) => ({ file, status: "waiting" }));
    setItems(list);
    stopRef.current = false;
    const update = (id: string, changes: Partial<Item>) =>
      setItems((prev) => prev?.map((it) => (it.file.id === id ? { ...it, ...changes } : it)) ?? prev);

    let next = 0;
    let imported = 0;
    const worker = async () => {
      while (next < queue.length && !stopRef.current) {
        const file = queue[next++];
        update(file.id, { status: "importing" });
        try {
          const r = await post<{ status: ItemStatus; message?: string }>("/api/drive/import", {
            target,
            fileId: file.id,
            ...(file.resourceKey && { resourceKey: file.resourceKey }),
            ...(tokenRef.current && { accessToken: tokenRef.current }),
          });
          if (r.status === "imported") imported++;
          update(file.id, { status: r.status, message: r.message });
        } catch (e) {
          // A limit or an outage: the rest would fail the same way
          update(file.id, { status: "failed", message: e instanceof Error ? e.message : "Failed" });
          if (e instanceof Error && /today|too many|isn't set up/i.test(e.message)) stopRef.current = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    // Anything never started (stopped) goes back to waiting -> shown as skipped
    setItems((prev) => prev?.map((it) => (it.status === "waiting" ? { ...it, status: "failed", message: "Not imported (stopped)" } : it)) ?? prev);
    onImported?.(imported);
  };

  const counts = items
    ? {
        imported: items.filter((i) => i.status === "imported").length,
        duplicate: items.filter((i) => i.status === "duplicate").length,
        failed: items.filter((i) => i.status === "failed").length,
      }
    : null;
  const destination = target === "library" ? "your library" : "the upload queue";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={() => !running && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface-raised shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">
              Import from Google Drive
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              PDFs go straight from Drive to {destination}, without using your data to download them.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={running} aria-label="Close" className="rounded p-1 text-text-muted hover:text-text-primary disabled:opacity-40">
            <FiX />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!scan && config && (config.picker || config.links) && (
            <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
              {(["drive", "link"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  disabled={m === "drive" ? !config.picker : !config.links}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-40 ${
                    mode === m ? "bg-surface-raised text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {m === "drive" ? "From my Drive" : "From a link"}
                </button>
              ))}
            </div>
          )}

          {!scan && config && !config.picker && !config.links && (
            <p className="text-sm text-text-secondary">Importing from Google Drive isn&apos;t set up yet. Check back soon.</p>
          )}

          {!scan && config?.picker && mode === "drive" && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Pick PDFs in Google Drive: open your study folder and select them (several at once). UniArchive can
                only open the files you pick.
              </p>
              <button
                type="button"
                onClick={doPick}
                disabled={picking}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {picking ? "Opening Google Drive…" : "Choose PDFs from Google Drive"}
              </button>
            </div>
          )}

          {!scan && config?.links && mode === "link" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doScan();
              }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium text-text-secondary" htmlFor={`${titleId}-url`}>
                Drive link to a folder or a PDF
              </label>
              <input
                id={`${titleId}-url`}
                ref={inputRef}
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-text-muted">
                The folder or file must be shared as &ldquo;Anyone with the link&rdquo;. Subfolders are included (3 levels).
              </p>
              <button
                type="submit"
                disabled={scanning || !url.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {scanning ? "Reading the link…" : "Find PDFs"}
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {scan && !items && (
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
                <FiFolder className="shrink-0" />
                <span className="min-w-0 truncate">
                  <strong className="text-text-primary">{scan.name}</strong>: {scan.files.length} PDF{scan.files.length === 1 ? "" : "s"}
                  {scan.truncated ? " (only the first ones are shown)" : ""}
                </span>
              </p>
              {scan.files.length > 1 && (
                <label className="mb-2 flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(allIds.slice(0, MAX_PER_RUN)))}
                  />
                  Select all{allIds.length > MAX_PER_RUN ? ` (first ${MAX_PER_RUN})` : ""}
                </label>
              )}
              <ul className="divide-y divide-border rounded-lg border border-border">
                {scan.files.map((f) => (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface">
                      <input type="checkbox" className="mt-1" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm text-text-primary">{f.name}</span>
                        <span className="block text-xs text-text-muted">
                          {[f.folderPath, f.size !== undefined ? formatFileSize(f.size) : null].filter(Boolean).join(" · ")}
                          {f.importedBefore && (
                            <span className="ml-1 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <FiCopy /> imported before
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items && (
            <div>
              {counts && !running && (
                <p role="status" className="mb-3 rounded-lg border border-border bg-surface p-3 text-sm text-text-primary">
                  Done: {counts.imported} imported{counts.duplicate ? `, ${counts.duplicate} already there` : ""}
                  {counts.failed ? `, ${counts.failed} failed` : ""}.
                </p>
              )}
              <ul className="divide-y divide-border rounded-lg border border-border">
                {items.map((it) => (
                  <li key={it.file.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span className="mt-0.5 shrink-0">
                      {it.status === "imported" ? (
                        <FiCheckCircle className="text-green-600" />
                      ) : it.status === "failed" ? (
                        <FiAlertCircle className="text-red-500" />
                      ) : it.status === "duplicate" ? (
                        <FiCopy className="text-amber-500" />
                      ) : (
                        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-text-muted/40" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm text-text-primary">{it.file.name}</span>
                      <span className="block text-xs text-text-muted">{it.message && it.status !== "imported" ? it.message : STATUS[it.status]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
          {scan && !items && (
            <>
              <button type="button" onClick={() => { setScan(null); setError(null); }} className="rounded-lg px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary">
                {scan.kind === "picked" ? "Pick again" : "Another link"}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={selected.size === 0}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Import {selected.size} PDF{selected.size === 1 ? "" : "s"}
              </button>
            </>
          )}
          {items && running && (
            <button type="button" onClick={() => (stopRef.current = true)} className="rounded-lg px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary">
              Stop after these
            </button>
          )}
          {items && !running && (
            <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
