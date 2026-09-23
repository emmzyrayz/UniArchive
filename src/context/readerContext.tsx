// context/readerContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Highlight } from "@/types/reader";

export type ViewMode = "paged" | "scroll";

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(min-width: 768px)").matches;
}

interface ReaderContextType {
  currentPage: number;
  numPages: number;
  zoom: number;
  sidebarOpen: boolean;
  highlightMode: boolean;
  highlights: Highlight[];
  bookmarkedPages: Set<number>;
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
  addHighlight: (h: Omit<Highlight, "id" | "createdAt">) => void;
  removeHighlight: (id: string) => void;
  toggleBookmark: (pageNumber: number) => void;
  isPageBookmarked: (pageNumber: number) => boolean;
  requestViewModeChange: (mode: ViewMode) => void;
  confirmViewModeChange: () => void;
  cancelViewModeChange: () => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarkedPages, setBookmarkedPages] = useState<Set<number>>(
    new Set(),
  );
  const [isMobile, setIsMobile] = useState(() => getIsMobile());
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    getIsMobile() ? "paged" : "scroll",
  );
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handleChange = () => setIsMobile(!mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
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

  const addHighlight = useCallback((h: Omit<Highlight, "id" | "createdAt">) => {
    setHighlights((prev) => [
      ...prev,
      {
        ...h,
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const toggleBookmark = useCallback((pageNumber: number) => {
    setBookmarkedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) next.delete(pageNumber);
      else next.add(pageNumber);
      return next;
    });
  }, []);

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
        bookmarkedPages,
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
