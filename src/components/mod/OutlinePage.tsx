// components/mod/OutlinePage.tsx
// Adds or edits the table of contents / course outline of a material that's
// already in the UniLibrary (/mod/materials/[id]/outline, also under
// /admin): the PDF on the right, the outline editor on the left. Saves
// through PATCH /api/admin/materials/[id].
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useStaffArea } from "@/components/admin/staffArea";
import { outlineKindFor, parseOutline, type MaterialOutline, type OutlineEntry } from "@/lib/outline";
import { extractPdfOutline, type OutlineSource } from "@/lib/pdfOutline";
import { OutlineEditor } from "./OutlineEditor";
import type { PdfDocument, PdfPaneHandle } from "@/components/pdf/PdfPane";

const PdfPane = dynamic(() => import("@/components/pdf/PdfPane"), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-sm text-text-muted">Loading viewer…</p>,
});

interface AdminMaterial {
  id: string;
  title: string;
  subcategory?: string;
  pageCount?: number;
  bookId: string;
  isActive: boolean;
  outline: MaterialOutline | null;
}

type Load =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; material: AdminMaterial; fileUrl: string | null };

async function getJson<T>(url: string): Promise<{ ok: boolean; data: T & { message?: string } }> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { message?: string } };
}

export function OutlinePage({ materialId }: { materialId: string }) {
  const { base } = useStaffArea();
  const pdfRef = useRef<PdfPaneHandle>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [entries, setEntries] = useState<OutlineEntry[]>([]);
  const [saved, setSaved] = useState("[]");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await getJson<{ material: AdminMaterial }>(`/api/admin/materials/${materialId}`);
      if (cancelled) return;
      if (!m.ok) {
        setLoad({ kind: "error", message: m.data.message ?? "Couldn't load this material." });
        return;
      }
      const book = await getJson<{ book: { fileUrl: string } }>(`/api/books/${m.data.material.bookId}`);
      if (cancelled) return;
      const initial = m.data.material.outline?.entries ?? [];
      setEntries(initial);
      setSaved(JSON.stringify(initial));
      setLoad({ kind: "ready", material: m.data.material, fileUrl: book.ok ? book.data.book.fileUrl : null });
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  if (load.kind === "loading") {
    return <p className="mt-[90px] p-6 text-center text-sm text-text-muted">Loading…</p>;
  }
  if (load.kind === "error") {
    return (
      <div className="mt-[90px] space-y-3 p-6 text-center">
        <p className="text-sm text-error">{load.message}</p>
        <Link href={`${base}/materials`} className="text-sm text-primary hover:underline">
          Back to materials
        </Link>
      </div>
    );
  }

  const { material } = load;
  const kind = outlineKindFor(material.subcategory);
  const pageCount = numPages || material.pageCount;
  const dirty = JSON.stringify(entries) !== saved;

  const save = async (next: OutlineEntry[]) => {
    const checked = parseOutline({ entries: next }, material.subcategory, pageCount);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/materials/${material.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outline: { entries: checked.value?.entries ?? [] } }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Couldn't save the outline.");
      return;
    }
    const savedEntries = checked.value?.entries ?? [];
    setEntries(savedEntries);
    setSaved(JSON.stringify(savedEntries));
    setMessage(savedEntries.length ? "Saved. Readers see it in the reader's Contents tab." : "Outline removed.");
  };

  return (
    <div className="mt-[70px] flex h-[calc(100vh-70px)]">
      <aside className="flex w-[40%] min-w-[360px] max-w-[620px] flex-col border-r border-border bg-surface-raised">
        <header className="border-b border-border px-5 py-3">
          <Link href={`${base}/materials`} className="text-sm text-text-secondary hover:text-text-primary">
            ← Materials
          </Link>
          <h1 className="mt-1 truncate font-semibold text-text-primary" title={material.title}>
            {material.title}
          </h1>
          {!material.isActive && <p className="text-xs text-warning">Deactivated: not visible to readers</p>}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {kind ? (
            <OutlineEditor
              kind={kind}
              entries={entries}
              onChange={(next) => {
                setEntries(next);
                setError(null);
                setMessage(null);
              }}
              currentPage={numPages ? currentPage : undefined}
              pageCount={pageCount}
              onImport={
                numPages
                  ? () =>
                      pdfDocRef.current
                        ? extractPdfOutline(pdfDocRef.current as unknown as OutlineSource)
                        : Promise.resolve([])
                  : undefined
              }
              onJump={(page) => pdfRef.current?.goToPage(page)}
              error={error}
            />
          ) : (
            <p className="text-sm text-text-secondary">
              Only textbooks, course materials, lecture notes, syllabi and tutorials have an outline.
              Change this material&apos;s type first.
            </p>
          )}
        </div>
        {kind && (
          <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
            <span className="mr-auto text-sm text-success" role="status">
              {message}
            </span>
            {saved !== "[]" && (
              <button
                type="button"
                onClick={() => void save([])}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-50"
              >
                Remove outline
              </button>
            )}
            <button
              type="button"
              onClick={() => void save(entries)}
              disabled={busy || !dirty}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save outline"}
            </button>
          </footer>
        )}
      </aside>
      <section className="min-w-0 flex-1" aria-label="PDF">
        {load.fileUrl ? (
          <PdfPane
            ref={pdfRef}
            url={load.fileUrl}
            onNumPages={setNumPages}
            onDocument={(pdf) => {
              pdfDocRef.current = pdf;
            }}
            onPageChange={setCurrentPage}
          />
        ) : (
          <p className="p-8 text-center text-sm text-text-muted">The PDF couldn&apos;t be loaded.</p>
        )}
      </section>
    </div>
  );
}
