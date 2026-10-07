// components/mod/BulkUploader.tsx
// Staff bulk upload (/mod/materials/upload and /admin/materials/upload): drop
// many PDFs, and each one is hashed, compressed (losslessly, in a Web Worker)
// and uploaded straight to Backblaze, two at a time. Uploaded files wait in
// the platform queue until someone fills in their details in the verify
// workspace. Duplicates of files already in the queue are skipped.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiCheckCircle, FiFileText, FiRefreshCw, FiUploadCloud, FiX } from "react-icons/fi";
import { AdminPageShell, cardClass } from "@/components/admin/adminUi";
import { useStaffArea } from "@/components/admin/staffArea";
import { formatFileSize } from "@/assets/data/libraryData";
import { putFileWithProgress } from "@/utils/uploadBook";
import type { PdfPrepRequest, PdfPrepResponse } from "@/workers/pdfPrep.worker";
import { DriveImportDialog } from "@/components/drive/DriveImportDialog";

const CONCURRENCY = 2;
const MAX_FILES_PER_BATCH = 100;
const MAX_FILE_SIZE = 500 * 1024 * 1024;

type ItemStatus = "queued" | "preparing" | "uploading" | "saving" | "done" | "duplicate" | "error";

interface Item {
  key: string;
  file: File;
  status: ItemStatus;
  progress: number; // upload %, 0-100
  uploadedSize?: number;
  pageCount?: number | null;
  error?: string;
  fileId?: string; // the platform file, once saved
  duplicateOf?: { id: string; title: string; status: string };
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  queued: "Waiting",
  preparing: "Compressing…",
  uploading: "Uploading",
  saving: "Saving…",
  done: "Uploaded",
  duplicate: "Already uploaded",
  error: "Failed",
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError((data.message as string) ?? "Something went wrong. Please try again.", res.status, data);
  }
  return data as T;
}

/** A pool of prep workers; each request resolves with its own response. */
function usePrepWorkers() {
  const workersRef = useRef<Worker[]>([]);
  const pendingRef = useRef(new Map<string, (r: PdfPrepResponse) => void>());
  const nextRef = useRef(0);

  useEffect(() => {
    const pending = pendingRef.current;
    const workers = Array.from({ length: CONCURRENCY }, () => {
      const worker = new Worker(new URL("../../workers/pdfPrep.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<PdfPrepResponse>) => {
        pending.get(event.data.id)?.(event.data);
        pending.delete(event.data.id);
      };
      return worker;
    });
    workersRef.current = workers;
    return () => {
      for (const w of workers) w.terminate();
      pending.clear();
    };
  }, []);

  return useCallback((request: PdfPrepRequest) => {
    return new Promise<PdfPrepResponse>((resolve) => {
      pendingRef.current.set(request.id, resolve);
      const workers = workersRef.current;
      workers[nextRef.current++ % workers.length].postMessage(request);
    });
  }, []);
}

export function BulkUploader() {
  const { base } = useStaffArea();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runningRef = useRef(new Set<string>());
  const prep = usePrepWorkers();

  const patch = useCallback((key: string, changes: Partial<Item>) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...changes } : it)));
  }, []);

  const processItem = useCallback(
    async (item: Item) => {
      try {
        patch(item.key, { status: "preparing", error: undefined, progress: 0 });
        const prepared = await prep({ id: item.key, file: item.file });
        if (!prepared.ok) throw new Error(prepared.error);

        let presign: { uploadUrl: string; storageKey: string };
        try {
          presign = await postJson("/api/mod/uploads/presign", {
            fileName: item.file.name,
            fileSize: prepared.bytes.byteLength,
            checksum: prepared.sha256,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409 && error.data.duplicateOf) {
            patch(item.key, {
              status: "duplicate",
              error: error.message,
              duplicateOf: error.data.duplicateOf as Item["duplicateOf"],
            });
            return;
          }
          throw error;
        }

        patch(item.key, {
          status: "uploading",
          uploadedSize: prepared.bytes.byteLength,
          pageCount: prepared.pageCount,
        });
        const upload = new File([prepared.bytes], item.file.name, { type: "application/pdf" });
        await putFileWithProgress(presign.uploadUrl, upload, (percent) =>
          patch(item.key, { progress: Math.round(percent) }),
        );

        patch(item.key, { status: "saving", progress: 100 });
        const saved = await postJson<{ file: { id: string } }>("/api/mod/uploads", {
          storageKey: presign.storageKey,
          fileName: item.file.name,
          checksum: prepared.sha256,
          originalSize: prepared.originalSize,
          ...(prepared.pageCount ? { pageCount: prepared.pageCount } : {}),
        });
        patch(item.key, { status: "done", fileId: saved.file.id });
      } catch (error) {
        patch(item.key, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed. Please try again.",
        });
      }
    },
    [patch, prep],
  );

  // Start queued items while fewer than CONCURRENCY are running
  useEffect(() => {
    const running = runningRef.current;
    const slots = CONCURRENCY - running.size;
    if (slots <= 0) return;
    const ready = items.filter((it) => it.status === "queued" && !running.has(it.key));
    for (const item of ready.slice(0, slots)) {
      running.add(item.key);
      void processItem(item).finally(() => {
        running.delete(item.key);
        // Wake the scheduler: the item's status change re-runs this effect
        setItems((list) => [...list]);
      });
    }
  }, [items, processItem]);

  const addFiles = (files: FileList | File[]) => {
    setNotice(null);
    const incoming = Array.from(files);
    const pdfs = incoming.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    const skipped = incoming.length - pdfs.length;
    const tooBig = pdfs.filter((f) => f.size > MAX_FILE_SIZE);
    const accepted = pdfs.filter((f) => f.size <= MAX_FILE_SIZE);
    const room = MAX_FILES_PER_BATCH - items.filter((it) => it.status !== "done").length;
    const added = accepted.slice(0, Math.max(0, room));

    const messages = [
      skipped && `${skipped} file${skipped === 1 ? " isn't a PDF" : "s aren't PDFs"} and ${skipped === 1 ? "was" : "were"} skipped.`,
      tooBig.length && `${tooBig.length} file${tooBig.length === 1 ? " is" : "s are"} over 500 MB.`,
      accepted.length > added.length && `Only ${MAX_FILES_PER_BATCH} files can wait at once; add the rest after these finish.`,
    ].filter(Boolean);
    if (messages.length) setNotice(messages.join(" "));

    setItems((list) => [
      ...list,
      ...added.map((file) => ({
        key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        status: "queued" as const,
        progress: 0,
      })),
    ]);
  };

  const retry = (key: string) => patch(key, { status: "queued", error: undefined, progress: 0 });
  const remove = (key: string) => setItems((list) => list.filter((it) => it.key !== key));
  const clearFinished = () =>
    setItems((list) => list.filter((it) => !["done", "duplicate"].includes(it.status)));

  const done = items.filter((it) => it.status === "done");
  const busy = items.some((it) => ["queued", "preparing", "uploading", "saving"].includes(it.status));
  const failed = items.filter((it) => it.status === "error").length;

  return (
    <AdminPageShell
      title="Upload materials"
      subtitle="PDFs go to the platform queue. Fill in each one's details in the verify workspace to publish it as UniArchive's."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDriveOpen(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-surface"
          >
            Import from Google Drive
          </button>
          <Link href={`${base}/materials/queue`} className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-surface">
            Open queue
          </Link>
        </div>
      }
    >
      {driveOpen && (
        <DriveImportDialog
          target="platform"
          onClose={() => setDriveOpen(false)}
          onImported={(n) => n > 0 && setNotice(`${n} PDF${n === 1 ? "" : "s"} imported from Google Drive into the queue.`)}
        />
      )}
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`${cardClass} flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-12 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
          }`}
        >
          <FiUploadCloud aria-hidden className="h-10 w-10 text-text-muted" />
          <p className="font-medium text-text-primary">Drop PDFs here, or click to choose</p>
          <p className="text-sm text-text-muted">
            Up to {MAX_FILES_PER_BATCH} at a time, 500 MB each. Files are compressed before uploading.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {notice && (
          <p role="status" className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-text-primary">
            {notice}
          </p>
        )}

        {items.length > 0 && (
          <div className={cardClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-secondary" aria-live="polite">
                {done.length} of {items.length} uploaded
                {failed > 0 && ` · ${failed} failed`}
                {busy && " · working…"}
              </p>
              <div className="flex gap-2">
                {!busy && items.some((it) => ["done", "duplicate"].includes(it.status)) && (
                  <button type="button" onClick={clearFinished} className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary">
                    Clear finished
                  </button>
                )}
                {done.length > 0 && (
                  <Link
                    href={`${base}/materials/verify/${done[0].fileId}`}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Start verifying
                  </Link>
                )}
              </div>
            </div>
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.key} className="flex flex-wrap items-center gap-3 py-3">
                  {it.status === "done" ? (
                    <FiCheckCircle aria-hidden className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <FiFileText aria-hidden className="h-5 w-5 shrink-0 text-text-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary" title={it.file.name}>
                      {it.file.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatFileSize(it.file.size)}
                      {it.uploadedSize !== undefined && it.uploadedSize < it.file.size &&
                        ` → ${formatFileSize(it.uploadedSize)} (${Math.round((1 - it.uploadedSize / it.file.size) * 100)}% smaller)`}
                      {it.pageCount ? ` · ${it.pageCount} pages` : ""}
                      {" · "}
                      <span className={it.status === "error" ? "text-error" : ""}>
                        {STATUS_LABEL[it.status]}
                        {it.status === "uploading" && ` ${it.progress}%`}
                      </span>
                    </p>
                    {it.status === "uploading" && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-primary transition-[width]" style={{ width: `${it.progress}%` }} />
                      </div>
                    )}
                    {it.error && <p className="mt-1 text-xs text-error">{it.error}</p>}
                  </div>
                  {it.status === "done" && it.fileId && (
                    <Link href={`${base}/materials/verify/${it.fileId}`} className="text-sm text-primary hover:underline">
                      Verify
                    </Link>
                  )}
                  {it.status === "error" && (
                    <button type="button" onClick={() => retry(it.key)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <FiRefreshCw aria-hidden /> Retry
                    </button>
                  )}
                  {["queued", "error", "duplicate"].includes(it.status) && (
                    <button
                      type="button"
                      onClick={() => remove(it.key)}
                      aria-label={`Remove ${it.file.name}`}
                      className="rounded p-1 text-text-muted hover:text-text-primary"
                    >
                      <FiX aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
