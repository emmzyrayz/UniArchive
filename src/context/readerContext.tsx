// context/readerContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Annotations, Bookmark, Highlight } from "@/types/reader";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  MAX_BOOKMARKS,
  MAX_HIGHLIGHTS,
} from "@/lib/constants/annotations";

export type ViewMode = "paged" | "scroll";

// Annotations are saved this often while they have unsaved changes, and
// again whenever the tab is hidden or the reader closes
const AUTOSAVE_MS = 30_000;
// Browsers refuse keepalive requests with bodies over 64 KiB
const KEEPALIVE_MAX_BYTES = 60_000;

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(min-width: 768px)").matches;
}

// Not crypto.randomUUID: it needs a secure context and newer browsers
const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Server items first, then anything added locally before the load finished. */
function mergeById<T extends { id: string }>(server: T[], local: T[]): T[] {
  const ids = new Set(server.map((item) => item.id));
  return [...server, ...local.filter((item) => !ids.has(item.id))];
}

type NewHighlight = Omit<Highlight, "id" | "createdAt" | "color"> & { color?: string };

interface ReaderContextType {
  currentPage: number;
  numPages: number;
  zoom: number;
  sidebarOpen: boolean;
  highlightMode: boolean;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  viewMode: ViewMode;
  isMobile: boolean;
  pendingViewMode: ViewMode | null;
  setNumPages: (n: number) => void;
  goToPage: (n: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setZoom: (z: number) => void;
  toggleSidebar: () => void;
  toggleHighlightMode: () => void;
  addHighlight: (h: NewHighlight) => void;
  removeHighlight: (id: string) => void;
  toggleBookmark: (pageNumber: number) => void;
  isPageBookmarked: (pageNumber: number) => boolean;
  requestViewModeChange: (mode: ViewMode) => void;
  confirmViewModeChange: () => void;
  cancelViewModeChange: () => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

/**
 * Keeps the reader's highlights and bookmarks in sync with
 * /api/books/[bookId]/annotations: loads them on open, then saves the full
 * state when it has changed (every 30s, when the tab is hidden, and when the
 * reader closes). Nothing is saved until the load has succeeded, so a failed
 * load can never overwrite what's stored.
 */
function useAnnotationSync(
  bookId: string,
  setHighlights: (update: (prev: Highlight[]) => Highlight[]) => void,
  setBookmarks: (update: (prev: Bookmark[]) => Bookmark[]) => void,
  current: Annotations,
) {
  const latestRef = useRef(current);
  const syncRef = useRef({ loaded: false, disabled: false, dirty: false, saving: false });

  useEffect(() => {
    latestRef.current = current;
  }, [current]);

  const markDirty = useCallback(() => {
    syncRef.current.dirty = true;
  }, []);

  useEffect(() => {
    const url = `/api/books/${encodeURIComponent(bookId)}/annotations`;
    const sync = { loaded: false, disabled: false, dirty: false, saving: false };
    syncRef.current = sync;
    let active = true;
    let loading = false;

    const load = () => {
      if (loading || sync.loaded || sync.disabled) return;
      loading = true;
      fetch(url, { credentials: "same-origin", cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            // Signed out or no access: annotations stay local to this visit
            if (res.status === 401 || res.status === 403 || res.status === 404) {
              sync.disabled = true;
            }
            throw new Error(`GET annotations ${res.status}`);
          }
          const data = (await res.json()) as Partial<Annotations>;
          if (!active) return;
          setHighlights((prev) => mergeById(data.highlights ?? [], prev));
          setBookmarks((prev) => {
            const pages = new Set((data.bookmarks ?? []).map((b) => b.pageNumber));
            return [...(data.bookmarks ?? []), ...prev.filter((b) => !pages.has(b.pageNumber))];
          });
          sync.loaded = true;
        })
        .catch((error) => {
          // Non-fatal: the reader works, and the next autosave tick retries
          console.warn("Failed to load annotations:", error);
        })
        .finally(() => {
          loading = false;
        });
    };

    const save = (leaving: boolean) => {
      if (!sync.loaded || !sync.dirty || (sync.saving && !leaving)) return;
      const body = JSON.stringify(latestRef.current);
      sync.dirty = false;
      sync.saving = true;
      fetch(url, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
        // keepalive lets the request outlive the page, within the size cap
        keepalive: leaving && body.length <= KEEPALIVE_MAX_BYTES,
      })
        .then((res) => {
          if (res.ok) return;
          // Retrying won't help a rejected body or a lost session
          if (res.status >= 500 || res.status === 429) sync.dirty = true;
          console.warn(`Failed to save annotations (HTTP ${res.status})`);
        })
        .catch((error) => {
          sync.dirty = true;
          console.warn("Failed to save annotations:", error);
        })
        .finally(() => {
          sync.saving = false;
        });
    };

    load();
    const interval = setInterval(() => {
      if (sync.loaded) save(false);
      else load();
    }, AUTOSAVE_MS);

    // Mobile browsers often never fire unload events; "hidden" is the last
    // reliable moment (app switch, tab close)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save(true);
    };
    const onPageHide = () => save(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the reader inside the app
      save(true);
    };
  }, [bookId, setHighlights, setBookmarks]);

  return markDirty;
}

export function ReaderProvider({
  bookId,
  initialPage = 1,
  children,
}: {
  bookId: string;
  /** Page to open on (from ?page=); clamped once the page count is known. */
  initialPage?: number;
  children: ReactNode;
}) {
  const { capability } = useDeviceCapability();
  const defaultZoom = capability === "low" ? 0.9 : 1.2;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPagesState] = useState(0);
  const [zoom, setZoom] = useState(defaultZoom);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isMobile, setIsMobile] = useState(() => getIsMobile());
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    getIsMobile() ? "paged" : "scroll",
  );
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null);

  // A later ?page= for the same book (e.g. from the dashboard) jumps there
  const [prevInitialPage, setPrevInitialPage] = useState(initialPage);
  if (initialPage !== prevInitialPage) {
    setPrevInitialPage(initialPage);
    setCurrentPage(numPages ? Math.min(Math.max(initialPage, 1), numPages) : initialPage);
  }

  const annotations = useMemo(() => ({ highlights, bookmarks }), [highlights, bookmarks]);
  const markDirty = useAnnotationSync(bookId, setHighlights, setBookmarks, annotations);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handleChange = () => setIsMobile(!mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Also pulls a ?page= beyond the end back onto the last page
  const setNumPages = useCallback((n: number) => {
    setNumPagesState(n);
    if (n > 0) setCurrentPage((prev) => Math.min(Math.max(prev, 1), n));
  }, []);

  const goToPage = useCallback(
    (n: number) =>
      setCurrentPage((prev) => Math.min(Math.max(n, 1), numPages || prev)),
    [numPages],
  );
  const nextPage = useCallback(
    () => goToPage(currentPage + 1),
    [currentPage, goToPage],
  );
  const prevPage = useCallback(
    () => goToPage(currentPage - 1),
    [currentPage, goToPage],
  );

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleHighlightMode = useCallback(
    () => setHighlightMode((prev) => !prev),
    [],
  );

  const addHighlight = useCallback(
    ({ color, ...h }: NewHighlight) => {
      markDirty();
      setHighlights((prev) => {
        if (prev.length >= MAX_HIGHLIGHTS) {
          console.warn(`Highlight limit reached (${MAX_HIGHLIGHTS} per book)`);
          return prev;
        }
        return [
          ...prev,
          {
            ...h,
            id: makeId("hl"),
            color: color ?? DEFAULT_HIGHLIGHT_COLOR,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    },
    [markDirty],
  );

  const removeHighlight = useCallback(
    (id: string) => {
      markDirty();
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    },
    [markDirty],
  );

  const toggleBookmark = useCallback(
    (pageNumber: number) => {
      markDirty();
      setBookmarks((prev) => {
        if (prev.some((b) => b.pageNumber === pageNumber)) {
          return prev.filter((b) => b.pageNumber !== pageNumber);
        }
        if (prev.length >= MAX_BOOKMARKS) {
          console.warn(`Bookmark limit reached (${MAX_BOOKMARKS} per book)`);
          return prev;
        }
        return [...prev, { id: makeId("bm"), pageNumber, createdAt: new Date().toISOString() }];
      });
    },
    [markDirty],
  );

  const bookmarkedPages = useMemo(
    () => new Set(bookmarks.map((b) => b.pageNumber)),
    [bookmarks],
  );
  const isPageBookmarked = useCallback(
    (pageNumber: number) => bookmarkedPages.has(pageNumber),
    [bookmarkedPages],
  );

  const requestViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (isMobile && mode === "scroll" && viewMode !== "scroll") {
        setPendingViewMode(mode);
        return;
      }
      setViewModeState(mode);
    },
    [isMobile, viewMode],
  );

  const confirmViewModeChange = useCallback(() => {
    if (pendingViewMode) setViewModeState(pendingViewMode);
    setPendingViewMode(null);
  }, [pendingViewMode]);

  const cancelViewModeChange = useCallback(() => setPendingViewMode(null), []);

  // Arrow keys: Down/Right = next, Up/Left = prev — works the same in both view modes now
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") prevPage();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage]);

  return (
    <ReaderContext.Provider
      value={{
        currentPage,
        numPages,
        zoom,
        sidebarOpen,
        highlightMode,
        highlights,
        bookmarks,
        viewMode,
        isMobile,
        pendingViewMode,
        setNumPages,
        goToPage,
        nextPage,
        prevPage,
        setZoom,
        toggleSidebar,
        toggleHighlightMode,
        addHighlight,
        removeHighlight,
        toggleBookmark,
        isPageBookmarked,
        requestViewModeChange,
        confirmViewModeChange,
        cancelViewModeChange,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader(): ReaderContextType {
  const context = useContext(ReaderContext);
  if (!context)
    throw new Error("useReader must be used within a ReaderProvider");
  return context;
}
