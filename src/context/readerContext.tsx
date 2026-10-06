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
import type { Annotations, Bookmark, Highlight, VersionedAnnotations } from "@/types/reader";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  MAX_BOOKMARKS,
  MAX_HIGHLIGHTS,
} from "@/lib/constants/annotations";

/** Smallest zoom: below "fit to width" on a small phone (an A4 page fits 360px at ~0.55) */
export const MIN_ZOOM = 0.3;

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

/**
 * Merges this tab's list with another tab's saved list, relative to `base`
 * (the last copy both agreed on). Additions from either side are kept;
 * a deletion on either side sticks. A plain union would resurrect items the
 * other tab deleted.
 */
function threeWayMerge<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const baseIds = new Set(base.map((i) => i.id));
  const localIds = new Set(local.map((i) => i.id));
  const remoteIds = new Set(remote.map((i) => i.id));
  return [
    // Theirs, minus what this tab deleted
    ...remote.filter((i) => !(baseIds.has(i.id) && !localIds.has(i.id))),
    // This tab's new items (ones in base but gone remotely were deleted there)
    ...local.filter((i) => !remoteIds.has(i.id) && !baseIds.has(i.id)),
  ];
}

/** One bookmark per page, as the toggle assumes; the first one wins. */
function onePerPage(bookmarks: Bookmark[]): Bookmark[] {
  const seen = new Set<number>();
  return bookmarks.filter((b) => !seen.has(b.pageNumber) && !!seen.add(b.pageNumber));
}

const sameIds = (a: { id: string }[], b: { id: string }[]) =>
  a.length === b.length && a.every((item) => b.some((other) => other.id === item.id));

type NewHighlight = Omit<Highlight, "id" | "createdAt" | "color"> & { color?: string };

interface ReaderContextType {
  currentPage: number;
  numPages: number;
  zoom: number;
  sidebarOpen: boolean;
  highlightMode: boolean;
  /** Colour for new highlights, from the toolbar palette */
  activeHighlightColor: string;
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
  setActiveHighlightColor: (color: string) => void;
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
 *
 * Two tabs on the same book: every save names the syncVersion it's based on.
 * If the other tab saved in between, the server answers 409 with its copy;
 * this tab merges (threeWayMerge) and saves again a moment later.
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
    const sync = {
      loaded: false,
      disabled: false,
      dirty: false,
      saving: false,
      // The server version and content this tab last loaded or saved
      version: 0,
      base: { highlights: [], bookmarks: [] } as Annotations,
    };
    syncRef.current = sync;
    let active = true;
    let loading = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

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
          const data = (await res.json()) as Partial<VersionedAnnotations>;
          if (!active) return;
          sync.version = data.syncVersion ?? 0;
          sync.base = { highlights: data.highlights ?? [], bookmarks: data.bookmarks ?? [] };
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

    /** Folds another tab's saved copy into this tab's state. */
    const mergeRemote = (remote: VersionedAnnotations) => {
      const base = sync.base;
      setHighlights((prev) => threeWayMerge(base.highlights, prev, remote.highlights));
      setBookmarks((prev) => onePerPage(threeWayMerge(base.bookmarks, prev, remote.bookmarks)));
      // Only save again if this tab had something the other didn't
      const local = latestRef.current;
      const merged = {
        highlights: threeWayMerge(base.highlights, local.highlights, remote.highlights),
        bookmarks: onePerPage(threeWayMerge(base.bookmarks, local.bookmarks, remote.bookmarks)),
      };
      sync.base = { highlights: remote.highlights, bookmarks: remote.bookmarks };
      sync.version = remote.syncVersion;
      if (!sameIds(merged.highlights, remote.highlights) || !sameIds(merged.bookmarks, remote.bookmarks)) {
        sync.dirty = true;
        // Once the merged state has rendered into latestRef
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => save(false), 1000);
      }
    };

    const save = (leaving: boolean) => {
      if (!sync.loaded || !sync.dirty || (sync.saving && !leaving)) return;
      const snapshot = latestRef.current;
      const body = JSON.stringify({ ...snapshot, syncVersion: sync.version });
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
        .then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as { syncVersion?: number };
            sync.version = data.syncVersion ?? sync.version + 1;
            sync.base = snapshot;
            return;
          }
          if (res.status === 409) {
            // Another tab saved first. Once this reader is gone there's no
            // state left to merge into, so a closing tab's save is dropped.
            const data = (await res.json()) as { current?: VersionedAnnotations };
            if (active && data.current) mergeRemote(data.current);
            return;
          }
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
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the reader inside the app
      save(true);
    };
  }, [bookId, setHighlights, setBookmarks]);

  return markDirty;
}

// Reading progress: only active time counts. The clock stops after this long
// without a page turn, scroll, tap or key press, and while the tab is hidden.
const IDLE_MS = 2 * 60 * 1000;
const PROGRESS_SYNC_MS = 30_000;
// The server accepts up to 600s per report; keep unsent time below that
const MAX_REPORT_SECONDS = 590;

/**
 * Reports reading progress to PATCH /api/books/[bookId]/progress every 30s,
 * when the tab is hidden and when the reader closes. Unsent time and pages
 * carry over to the next report if one fails.
 *
 * Kept separate from the annotation sync: it's a different endpoint, so
 * sharing a timer wouldn't save a request, and each skips its request when
 * there's nothing new to send.
 */
function useReadingProgress(bookId: string, currentPage: number, numPages: number) {
  // Everything the listeners need, without re-subscribing on every page turn
  const track = useRef({
    currentPage,
    numPages,
    pages: new Set<number>(),
    lastActivity: 0,
    countedTo: 0,
    pendingSeconds: 0,
    visible: true,
    newSession: true,
  });

  // A page turn is reading activity, and a page viewed in this window
  useEffect(() => {
    const t = track.current;
    t.currentPage = currentPage;
    t.numPages = numPages;
    if (numPages > 0) t.pages.add(currentPage);
    t.lastActivity = Date.now();
  }, [currentPage, numPages]);

  useEffect(() => {
    const t = track.current;
    const url = `/api/books/${encodeURIComponent(bookId)}/progress`;
    const start = Date.now();
    Object.assign(t, {
      lastActivity: start,
      countedTo: start,
      pendingSeconds: 0,
      visible: document.visibilityState === "visible",
      newSession: true,
    });
    t.pages.clear();
    if (t.numPages > 0) t.pages.add(t.currentPage);
    let sending = false;

    /** Adds active time up to now, stopping IDLE_MS after the last activity. */
    const accrue = () => {
      const now = Date.now();
      if (t.visible) {
        const until = Math.min(now, t.lastActivity + IDLE_MS);
        if (until > t.countedTo) t.pendingSeconds += (until - t.countedTo) / 1000;
      }
      t.countedTo = now;
    };

    const onActivity = () => {
      accrue();
      t.lastActivity = Date.now();
    };

    const sync = (leaving: boolean) => {
      accrue();
      if (!t.numPages || (sending && !leaving)) return;
      const seconds = Math.min(Math.floor(t.pendingSeconds), MAX_REPORT_SECONDS);
      const pages = [...t.pages];
      if (seconds === 0 && pages.length === 0 && !t.newSession) return;

      const newSession = t.newSession;
      // Taken out of the pool now so an overlapping report (closing while
      // one is in flight) can't send them twice; restored if this one fails
      t.pendingSeconds -= seconds;
      for (const p of pages) t.pages.delete(p);
      t.newSession = false;
      sending = true;
      fetch(url, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage: t.currentPage,
          totalPages: t.numPages,
          sessionSeconds: seconds,
          pagesViewedThisSession: pages.length,
          newSession,
        }),
        keepalive: leaving,
      })
        .then((res) => {
          if (res.ok) return;
          // A rejected report or lost access won't succeed on retry
          if (res.status < 500 && res.status !== 429) {
            console.warn(`Reading progress not saved (HTTP ${res.status})`);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        })
        .catch((error) => {
          // Non-fatal: whatever wasn't sent goes with the next report
          console.warn("Failed to save reading progress:", error);
          t.pendingSeconds = Math.min(t.pendingSeconds + seconds, MAX_REPORT_SECONDS);
          for (const p of pages) t.pages.add(p);
          if (newSession) t.newSession = true;
        })
        .finally(() => {
          sending = false;
        });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        accrue();
        t.visible = false;
        sync(true);
      } else {
        // Time away doesn't count
        t.visible = true;
        t.countedTo = Date.now();
        t.lastActivity = Date.now();
      }
    };
    const onPageHide = () => sync(true);

    const activityEvents = ["pointerdown", "keydown", "wheel", "scroll", "touchstart"] as const;
    for (const e of activityEvents) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    const interval = setInterval(() => sync(false), PROGRESS_SYNC_MS);

    return () => {
      clearInterval(interval);
      for (const e of activityEvents) window.removeEventListener(e, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the reader inside the app
      sync(true);
    };
  }, [bookId]);
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
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>(DEFAULT_HIGHLIGHT_COLOR);
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
  useReadingProgress(bookId, currentPage, numPages);

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
        activeHighlightColor,
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
        setActiveHighlightColor,
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
