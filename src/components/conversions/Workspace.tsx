// components/conversions/Workspace.tsx
// The conversion workspace (/contribute/[materialId]): the material's PDF
// beside an editor for typing it out. On a computer the two sit side by
// side (drag the divider to resize); on a phone, switch between them, with
// a strip showing which page you're typing from.
//
// Work autosaves through lib/draftSync.ts (this device first, then the
// account), so reloads, crashes and dropped connections lose nothing.
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiBookOpen, FiEdit3, FiMonitor } from "react-icons/fi";
import { useDraftSession } from "@/hooks/useDraftSession";
import { canRunModernPdf } from "@/lib/deviceCapability";
import type { ConversionKind } from "@/lib/conversions";
import type { PdfPaneHandle } from "@/components/pdf/PdfPane";
import { PageImagePane } from "./PageImagePane";
import { SyncStatus } from "./SyncStatus";
import { QuestionsDraftEditor } from "./QuestionsDraftEditor";
import { NoteDraftEditor } from "./NoteDraftEditor";
import type { ContentDocumentDto } from "@/types/layer2";

// pdf.js only runs in the browser
const PdfPane = dynamic(() => import("@/components/pdf/PdfPane"), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-sm text-text-muted">Loading the PDF…</p>,
});

export interface WorkspaceBook {
  id: string;
  fileUrl?: string;
  storageProvider: "cloudinary" | "backblaze";
  hasPageImages?: boolean;
  pageCount?: number;
}

const SPLIT_KEY = "uniarchive:contribute-split";
const SPLIT_MIN = 25;
const SPLIT_MAX = 75;

function readSplit(): number {
  try {
    const n = Number(localStorage.getItem(SPLIT_KEY));
    return n >= SPLIT_MIN && n <= SPLIT_MAX ? n : 50;
  } catch {
    return 50;
  }
}

const noopSubscribe = () => () => {};
const NAVBAR_HEIGHT = 70;

/** The announcement ribbon's height: the navbar sits below it (components/UI/scrollribbon.tsx). */
function useRibbonHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const ribbon = document.querySelector<HTMLElement>(".scroll-ribbon");
      if (ribbon) setHeight(ribbon.offsetHeight);
    });
    const onHeight = (e: Event) => setHeight((e as CustomEvent<{ height: number }>).detail.height);
    document.addEventListener("ribbonHeightChanged", onHeight);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("ribbonHeightChanged", onHeight);
    };
  }, []);
  return height;
}

export function Workspace({
  materialId,
  materialTitle,
  courseCode,
  kind,
  editing,
  book,
  bookError,
  upid,
  canMarkCorrect,
}: {
  materialId: string;
  materialTitle: string;
  courseCode?: string;
  kind: ConversionKind;
  /** The published note being edited */
  editing?: ContentDocumentDto;
  book: WorkspaceBook | null;
  bookError: string | null;
  upid: string;
  canMarkCorrect: boolean;
}) {
  const router = useRouter();
  const { session, state } = useDraftSession({ upid, materialId, kind, targetDocId: editing?.id });
  const modernPdf = useSyncExternalStore(noopSubscribe, canRunModernPdf, () => null);
  const pdfRef = useRef<PdfPaneHandle>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ribbonHeight = useRibbonHeight();

  const [view, setView] = useState<"pdf" | "type">("type");
  const [split, setSplit] = useState(readSplit);
  const [shownPage, setShownPage] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  // The page in view: what the PDF reports, else where the draft left off
  const page = shownPage ?? state.lastPage ?? 1;

  const onPageChange = useCallback(
    (p: number) => {
      setShownPage(p);
      session.setLastPage(p);
    },
    [session],
  );

  const showPage = (p: number) => {
    setView("pdf");
    if (pdfRef.current) pdfRef.current.goToPage(p);
    else onPageChange(p);
  };

  // Drag the divider (computer layout)
  const dragging = useRef(false);
  const onDividerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDividerMove = (e: PointerEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!dragging.current || !grid) return;
    const rect = grid.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(Math.round(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct))));
  };
  const onDividerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      localStorage.setItem(SPLIT_KEY, String(split));
    } catch {
      // Not remembered; fine
    }
  };

  const done = (docId?: string) => {
    const tab = kind === "questions" ? "questions" : "notes";
    router.push(`/materials/${materialId}?tab=${tab}${docId ? `&doc=${docId}` : ""}`);
  };

  const discard = async () => {
    setDiscardError(null);
    if (await session.discard()) done();
    else setDiscardError("Couldn't discard while offline. Try again when you're connected.");
  };

  const hasImages = !!book && (book.storageProvider === "cloudinary" || !!book.hasPageImages);
  const pageCount = book?.pageCount ?? 0;

  let pdfView: React.ReactNode;
  if (bookError) {
    pdfView = <PaneMessage>{bookError}</PaneMessage>;
  } else if (!book || modernPdf === null) {
    pdfView = <PaneMessage>Loading the PDF…</PaneMessage>;
  } else if (modernPdf && book.fileUrl) {
    pdfView = <PdfPane ref={pdfRef} url={book.fileUrl} initialPage={state.lastPage} onPageChange={onPageChange} />;
  } else if (hasImages && pageCount > 0) {
    pdfView = <PageImagePane bookId={book.id} pageCount={pageCount} page={page} onPageChange={onPageChange} />;
  } else {
    pdfView = (
      <PaneMessage>
        <FiMonitor aria-hidden className="mx-auto mb-2 text-2xl" />
        This PDF can&apos;t be shown on this device. You can still type here if you have the paper or another screen
        open, or continue on a computer: your work syncs to your account.
      </PaneMessage>
    );
  }

  const heading =
    kind === "questions" ? "Typing out past questions" : editing ? `Editing “${editing.title}”` : "Writing typed notes";

  return (
    // Pinned between the navbar and (below xl) the mobile tab bar, so only the panes scroll
    <div style={{ top: NAVBAR_HEIGHT + ribbonHeight }} className="fixed inset-x-0 bottom-14 z-30 flex flex-col bg-surface xl:bottom-0">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-surface-raised px-4 py-2">
        <Link
          href={`/materials/${materialId}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <FiArrowLeft aria-hidden className="shrink-0" />
          <span className="truncate">
            {courseCode ? `${courseCode} · ` : ""}
            {materialTitle}
          </span>
        </Link>
        <span className="hidden text-sm font-medium text-text-primary md:inline">{heading}</span>
        <div className="ml-auto flex items-center gap-4">
          <SyncStatus state={state} onSyncNow={() => void session.syncNow()} />
          {!state.readOnly &&
            (confirmDiscard ? (
              <span className="flex items-center gap-2 text-xs">
                Discard this draft?
                <button type="button" onClick={() => void discard()} className="font-semibold text-error hover:underline">
                  Discard
                </button>
                <button type="button" onClick={() => setConfirmDiscard(false)} className="hover:underline">
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDiscard(true)} className="text-xs text-text-muted hover:text-error">
                Discard draft
              </button>
            ))}
        </div>
      </header>

      <Banners
        state={state}
        discardError={discardError}
        onTakeOver={() => void session.takeOver()}
        onUseOther={() => session.takeOtherVersion()}
        onKeepMine={() => session.dismissOtherVersion()}
      />

      {/* Phone: switch between the PDF and the editor */}
      <div role="tablist" aria-label="Workspace view" className="flex border-b border-border bg-surface-raised lg:hidden">
        {(
          [
            ["type", "Type", FiEdit3],
            ["pdf", `PDF · page ${page}`, FiBookOpen],
          ] as const
        ).map(([id, text, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              view === id ? "border-primary text-text-primary" : "border-transparent text-text-muted"
            }`}
          >
            <Icon aria-hidden /> {text}
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        style={{ "--split": `${split}%` } as CSSProperties}
        className="min-h-0 flex-1 lg:grid lg:grid-cols-[var(--split)_6px_minmax(0,1fr)]"
      >
        <section aria-label="PDF" className={`${view === "pdf" ? "flex" : "hidden"} h-full min-h-0 flex-col lg:flex`}>
          {pdfView}
        </section>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize"
          aria-valuenow={split}
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              const step = e.key === "ArrowLeft" ? -5 : 5;
              setSplit((s) => {
                const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, s + step));
                try {
                  localStorage.setItem(SPLIT_KEY, String(next));
                } catch {
                  // Not remembered; fine
                }
                return next;
              });
            }
          }}
          onPointerDown={onDividerDown}
          onPointerMove={onDividerMove}
          onPointerUp={onDividerUp}
          onPointerCancel={onDividerUp}
          className="hidden cursor-col-resize touch-none bg-border hover:bg-primary/50 focus-visible:bg-primary lg:block"
        />
        <section aria-label="Editor" className={`${view === "type" ? "block" : "hidden"} h-full min-h-0 overflow-y-auto overscroll-contain lg:block`}>
          {/* Phone: which page this is from, one tap to look at it */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2 text-xs text-text-secondary backdrop-blur lg:hidden">
            <span>Typing from page {page}</span>
            <button type="button" onClick={() => showPage(page)} className="font-semibold text-primary">
              Show page
            </button>
          </div>
          {state.status === "loading" ? (
            <p className="p-8 text-center text-sm text-text-muted">Loading your draft…</p>
          ) : kind === "questions" ? (
            <QuestionsDraftEditor
              session={session}
              state={state}
              materialId={materialId}
              currentPage={page}
              canMarkCorrect={canMarkCorrect}
              onShowPage={showPage}
              onFinished={() => done()}
            />
          ) : (
            <NoteDraftEditor session={session} state={state} materialId={materialId} editing={editing} onFinished={(id) => done(id)} />
          )}
        </section>
      </div>
    </div>
  );
}

function PaneMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center bg-neutral-200 p-8 dark:bg-neutral-900">
      <p className="max-w-sm text-center text-sm text-text-secondary">{children}</p>
    </div>
  );
}

function Banners({
  state,
  discardError,
  onTakeOver,
  onUseOther,
  onKeepMine,
}: {
  state: ReturnType<typeof useDraftSession>["state"];
  discardError: string | null;
  onTakeOver: () => void;
  onUseOther: () => void;
  onKeepMine: () => void;
}) {
  const box = "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm";
  return (
    <>
      {state.readOnly && state.status !== "signed-out" && (
        <div className={`${box} border-primary/30 bg-primary/10 text-text-primary`}>
          This draft is open in another tab, so it&apos;s read-only here.
          <button type="button" onClick={onTakeOver} className="font-semibold text-primary hover:underline">
            Edit here instead
          </button>
        </div>
      )}
      {state.status === "signed-out" && (
        <div role="alert" className={`${box} border-warning/40 bg-warning/10 text-text-primary`}>
          {state.readOnly
            ? "You signed out, so this draft was closed."
            : "You've been signed out. Your work is safe on this device and syncs once you sign in again."}
          {!state.readOnly && (
            <a href="/auth?view=signin" target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">
              Sign in (new tab)
            </a>
          )}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div role="alert" className={`${box} border-error/30 bg-error/10 text-text-primary`}>
          {state.message}
          {state.blocked && " Your work is still saved on this device."}
          {state.blocked && /in progress/.test(state.message) && (
            <Link href="/dashboard?tab=conversions" className="font-semibold text-primary hover:underline">
              Your conversions
            </Link>
          )}
        </div>
      )}
      {state.noLocalStore && (
        <div className={`${box} border-warning/40 bg-warning/10 text-text-primary`}>
          This browser isn&apos;t letting UniArchive save on the device (private browsing?). Your work is saved to your
          account while you&apos;re online.
        </div>
      )}
      {state.otherVersion && (
        <div role="alert" className={`${box} border-warning/40 bg-warning/10 text-text-primary`}>
          This note was also changed on another device or tab. You&apos;re seeing this device&apos;s version.
          <button type="button" onClick={onUseOther} className="font-semibold text-primary hover:underline">
            Use the other version
          </button>
          <button type="button" onClick={onKeepMine} className="hover:underline">
            Keep this one
          </button>
        </div>
      )}
      {discardError && (
        <div role="alert" className={`${box} border-error/30 bg-error/10 text-text-primary`}>
          {discardError}
        </div>
      )}
    </>
  );
}
