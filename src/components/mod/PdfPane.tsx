// components/mod/PdfPane.tsx
// The verify workspace's PDF view: a continuous scroll of pages with page
// jump, prev/next and zoom. Only pages near the viewport are rendered; the
// rest are placeholders sized from each page's real proportions (estimated
// from the first page until a page has loaded), so a 900-page textbook stays
// light. Reports the page in view so the form can use it.
//
// Built straight on react-pdf: the reader's PdfCanvas is tied to the reader
// context (highlights, bookmarks, progress), which reviewing doesn't need.
"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { FiChevronLeft, FiChevronRight, FiMaximize2, FiZoomIn, FiZoomOut } from "react-icons/fi";

// Same worker the reader uses (polyfills URL.parse, then loads pdf.js)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.wrapper.mjs";

const GAP = 16; // px between pages
const OVERSCAN = 2; // pages rendered above and below the visible ones
const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const DEFAULT_RATIO = 1.414; // A4 portrait, until the first page loads

export interface PdfPaneHandle {
  goToPage: (page: number) => void;
}

interface Props {
  url: string;
  onNumPages?: (n: number) => void;
  onPageChange?: (page: number) => void;
  ref?: Ref<PdfPaneHandle>;
}

export default function PdfPane({ url, onNumPages, onPageChange, ref }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(ZOOMS.indexOf(1));
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset when the file changes
  const [shownUrl, setShownUrl] = useState(url);
  if (shownUrl !== url) {
    setShownUrl(url);
    setNumPages(0);
    setRatios({});
    setCurrent(1);
    setPageInput("1");
    setLoadError(null);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoom = ZOOMS[zoomIndex];
  const pageWidth = Math.max(200, Math.floor((containerWidth - 48) * zoom));
  const fallbackRatio = ratios[1] ?? DEFAULT_RATIO;

  // Top offset of every page, from each page's height (real or estimated)
  const offsets = useMemo(() => {
    const tops: number[] = [];
    let y = GAP;
    for (let p = 1; p <= numPages; p++) {
      tops.push(y);
      y += Math.round(pageWidth * (ratios[p] ?? fallbackRatio)) + GAP;
    }
    return { tops, total: y };
  }, [numPages, pageWidth, ratios, fallbackRatio]);

  const pageAt = useCallback(
    (scrollTop: number) => {
      // The page whose top is closest above a point 30% down the viewport
      const probe = scrollTop + (scrollRef.current?.clientHeight ?? 0) * 0.3;
      let lo = 0;
      let hi = offsets.tops.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (offsets.tops[mid] <= probe) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    },
    [offsets],
  );

  const [visible, setVisible] = useState<[number, number]>([1, 3]);
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !numPages) return;
    const page = pageAt(el.scrollTop);
    const last = pageAt(el.scrollTop + el.clientHeight * 0.7);
    setVisible([Math.max(1, page - OVERSCAN), Math.min(numPages, last + OVERSCAN)]);
    if (page !== current) {
      setCurrent(page);
      setPageInput(String(page));
    }
  }, [current, numPages, pageAt]);

  // Recompute what's visible when sizes change (zoom, resize, pages loading)
  useEffect(() => {
    onScroll();
  }, [onScroll]);

  useEffect(() => {
    onPageChange?.(current);
  }, [current, onPageChange]);

  const goToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      if (!el || !numPages) return;
      const p = Math.min(Math.max(1, Math.round(page)), numPages);
      el.scrollTo({ top: offsets.tops[p - 1] - GAP, behavior: "instant" as ScrollBehavior });
      // Don't wait for the scroll event: the form may read the page right away
      setCurrent(p);
      setPageInput(String(p));
    },
    [numPages, offsets],
  );

  useImperativeHandle(ref, () => ({ goToPage }), [goToPage]);

  // Keep the same page in view when zooming. The scroll has to wait for the
  // offsets at the new zoom, so it happens in the layout effect below.
  const pendingPage = useRef<number | null>(null);
  const zoomTo = (index: number) => {
    pendingPage.current = current;
    setZoomIndex(Math.min(Math.max(0, index), ZOOMS.length - 1));
  };
  useLayoutEffect(() => {
    const page = pendingPage.current;
    const el = scrollRef.current;
    if (page === null || !el || !numPages) return;
    pendingPage.current = null;
    el.scrollTop = offsets.tops[page - 1] - GAP;
  }, [offsets, numPages]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-200 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-raised px-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => goToPage(current - 1)}
          disabled={current <= 1}
          aria-label="Previous page"
          className="rounded p-1.5 text-text-secondary hover:bg-surface disabled:opacity-40"
        >
          <FiChevronLeft aria-hidden />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number.parseInt(pageInput, 10);
            if (Number.isFinite(n)) goToPage(n);
          }}
          className="flex items-center gap-1.5 text-text-secondary"
        >
          <label htmlFor="pdf-page" className="sr-only">
            Page
          </label>
          <input
            id="pdf-page"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-14 rounded border border-border bg-surface px-2 py-1 text-center text-text-primary"
          />
          <span>of {numPages || "…"}</span>
        </form>
        <button
          type="button"
          onClick={() => goToPage(current + 1)}
          disabled={!numPages || current >= numPages}
          aria-label="Next page"
          className="rounded p-1.5 text-text-secondary hover:bg-surface disabled:opacity-40"
        >
          <FiChevronRight aria-hidden />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomTo(zoomIndex - 1)}
            disabled={zoomIndex === 0}
            aria-label="Zoom out"
            className="rounded p-1.5 text-text-secondary hover:bg-surface disabled:opacity-40"
          >
            <FiZoomOut aria-hidden />
          </button>
          <span className="w-12 text-center tabular-nums text-text-secondary">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => zoomTo(zoomIndex + 1)}
            disabled={zoomIndex === ZOOMS.length - 1}
            aria-label="Zoom in"
            className="rounded p-1.5 text-text-secondary hover:bg-surface disabled:opacity-40"
          >
            <FiZoomIn aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => zoomTo(ZOOMS.indexOf(1))}
            aria-label="Fit width"
            title="Fit width"
            className="rounded p-1.5 text-text-secondary hover:bg-surface"
          >
            <FiMaximize2 aria-hidden />
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-auto">
        {loadError ? (
          <p className="p-8 text-center text-sm text-error">{loadError}</p>
        ) : (
          <Document
            file={url}
            // react-pdf's default Suspense mode also throws load errors to the
            // nearest error boundary, which would take the whole workspace
            // down when a signed URL expires; handle them here instead
            suspense={false}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              onNumPages?.(n);
            }}
            onLoadError={(error) => setLoadError(`Couldn't open this PDF: ${error.message}`)}
            loading={<p className="p-8 text-center text-sm text-text-muted">Loading PDF…</p>}
          >
            <div className="relative mx-auto" style={{ height: offsets.total, width: pageWidth }}>
              {numPages > 0 &&
                Array.from({ length: visible[1] - visible[0] + 1 }, (_, i) => visible[0] + i).map((p) => (
                  <div
                    key={p}
                    className="absolute left-0 bg-white shadow"
                    style={{
                      top: offsets.tops[p - 1],
                      width: pageWidth,
                      height: Math.round(pageWidth * (ratios[p] ?? fallbackRatio)),
                    }}
                  >
                    <Page
                      pageNumber={p}
                      width={pageWidth}
                      suspense={false}
                      renderAnnotationLayer={false}
                      loading={null}
                      onLoadSuccess={(page) => {
                        const ratio = page.originalHeight / page.originalWidth;
                        setRatios((r) => (r[p] === ratio ? r : { ...r, [p]: ratio }));
                      }}
                    />
                  </div>
                ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
