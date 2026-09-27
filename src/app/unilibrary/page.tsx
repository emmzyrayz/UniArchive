// app/unilibrary/page.tsx
// The public UniLibrary feed: verified materials, filterable by category,
// university, level and verification tier. Open to everyone; reading a
// material needs a sign-in. Filters live in the URL so links are shareable.
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/userContext";
import { isMaterialCategory } from "@/lib/constants/materialCategories";
import { CategoryTabs } from "@/components/unilibrary/CategoryTabs";
import { MaterialCard } from "@/components/unilibrary/MaterialCard";
import { MaterialCardSkeleton } from "@/components/unilibrary/MaterialCardSkeleton";
import {
  DEFAULT_FILTERS,
  MaterialsFilter,
  countActiveFilters,
  type MaterialFilters,
} from "@/components/unilibrary/MaterialsFilter";
import { UniLibraryEmptyState } from "@/components/unilibrary/UniLibraryEmptyState";
import { LEVEL_OPTIONS } from "@/components/unilibrary/materialLabels";
import type { MaterialsResponse } from "@/types/unilibrary";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_COUNT = 6;

interface Feed extends MaterialsResponse {
  /** The query these results belong to; a mismatch means a fetch is pending. */
  key: string;
}

function filtersFromUrl(params: URLSearchParams): MaterialFilters {
  const category = params.get("category") ?? "";
  const level = params.get("level") ?? "";
  const tier = params.get("tier") ?? "";
  const universityId = params.get("universityId") ?? "";
  return {
    search: params.get("search") ?? "",
    category: isMaterialCategory(category) ? category : "",
    universityId: /^[a-f0-9]{24}$/i.test(universityId) ? universityId : "",
    universityName: params.get("universityName") ?? "",
    level: (LEVEL_OPTIONS as readonly string[]).includes(level) ? level : "",
    tier: tier === "1" || tier === "2" ? tier : "",
    sort: params.get("sort") === "popular" ? "popular" : "recent",
  };
}

/** URL/API query for the filters; defaults are left out. */
function toQuery(filters: MaterialFilters, search: string): string {
  const q = new URLSearchParams();
  if (search.trim()) q.set("search", search.trim());
  if (filters.category) q.set("category", filters.category);
  if (filters.universityId) {
    q.set("universityId", filters.universityId);
    // Only for showing the name when a shared link is opened; the API ignores it
    if (filters.universityName) q.set("universityName", filters.universityName);
  }
  if (filters.level) q.set("level", filters.level);
  if (filters.tier) q.set("tier", filters.tier);
  if (filters.sort !== "recent") q.set("sort", filters.sort);
  return q.toString();
}

async function fetchMaterials(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<MaterialsResponse> {
  const q = new URLSearchParams(query);
  q.set("page", String(page));
  q.set("limit", String(PAGE_SIZE));
  const res = await fetch(`/api/materials?${q}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/materials ${res.status}`);
  return (await res.json()) as MaterialsResponse;
}

function UniLibraryFeed() {
  const searchParams = useSearchParams();
  const { hasActiveSession } = useUser();

  const [filters, setFilters] = useState<MaterialFilters>(() =>
    filtersFromUrl(new URLSearchParams(searchParams.toString())),
  );
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const query = useMemo(() => toQuery(filters, debouncedSearch), [filters, debouncedSearch]);

  // Follow URL changes made from outside the page (a nav link such as
  // /unilibrary?category=EXAMS, back/forward). Our own writes below always
  // match the current query, so they are skipped.
  const urlQuery = searchParams.toString();
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== query) {
      const next = filtersFromUrl(new URLSearchParams(urlQuery));
      setFilters(next);
      setDebouncedSearch(next.search);
    }
  }
  const loading = feed?.key !== query && error?.key !== query;

  useEffect(() => {
    if (filters.search === debouncedSearch) return;
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search, debouncedSearch]);

  // Page 1 for every new query, replacing what was there
  useEffect(() => {
    const controller = new AbortController();
    fetchMaterials(query, 1, controller.signal)
      .then((data) => {
        setFeed({ ...data, key: query });
        setError(null);
        setLoadMoreError(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        console.error("UniLibrary feed failed to load:", err);
        setError({ key: query, message: "Couldn't load the UniLibrary. Check your connection." });
      });
    return () => controller.abort();
  }, [query]);

  // Keep the URL shareable. The native history API updates useSearchParams
  // without a server round trip or scroll jump.
  useEffect(() => {
    if (window.location.search.replace(/^\?/, "") === query) return;
    window.history.replaceState(null, "", query ? `/unilibrary?${query}` : "/unilibrary");
  }, [query]);

  const updateFilters = useCallback((patch: Partial<MaterialFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch("");
  }, []);

  const loadMore = async () => {
    if (!feed || loadingMore) return;
    const key = feed.key;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const data = await fetchMaterials(key, feed.page + 1);
      // Drop the page if the filters changed while it was loading
      setFeed((prev) =>
        prev && prev.key === key
          ? {
              ...data,
              key,
              materials: [
                ...prev.materials,
                // A new upload can shift offsets between pages
                ...data.materials.filter((m) => !prev.materials.some((p) => p._id === m._id)),
              ],
            }
          : prev,
      );
    } catch (err) {
      console.error("UniLibrary: load more failed:", err);
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const recordView = useCallback((materialId: string) => {
    // keepalive: the request outlives the navigation to the reader
    fetch(`/api/materials/${materialId}/view`, { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, []);

  const filtersActive = countActiveFilters({ ...filters, sort: "recent" }) > 0;
  const current = feed?.key === query ? feed : null;

  return (
    <div className="min-h-screen mt-[60px] px-4 pb-24 pt-6 sm:px-6 lg:pt-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 lg:mb-6">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">UniLibrary</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Verified past questions, notes and textbooks from Nigerian universities.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-4">
          <CategoryTabs
            active={filters.category}
            counts={feed?.categoryCounts ?? {}}
            countsLoaded={!!feed}
            onChange={(category) => updateFilters({ category })}
          />

          <aside className="lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <MaterialsFilter filters={filters} onChange={updateFilters} />
          </aside>

          <section
            aria-label="Materials"
            aria-busy={loading}
            className="max-w-2xl space-y-4 lg:col-start-2 lg:row-start-2"
          >
            {loading && !current ? (
              Array.from({ length: SKELETON_COUNT }, (_, i) => <MaterialCardSkeleton key={i} />)
            ) : error?.key === query ? (
              <div className="rounded-xl border border-border bg-surface-raised p-6 text-center text-sm text-text-secondary">
                {error.message}
              </div>
            ) : current && current.materials.length === 0 ? (
              <UniLibraryEmptyState
                filtersActive={filtersActive}
                isAuthenticated={hasActiveSession}
                onClearFilters={clearFilters}
              />
            ) : current ? (
              <>
                <p className="text-xs text-text-muted">
                  {current.total.toLocaleString()}{" "}
                  {current.total === 1 ? "material" : "materials"}
                </p>
                {current.materials.map((material) => (
                  <MaterialCard
                    key={material._id}
                    material={material}
                    isAuthenticated={hasActiveSession}
                    onRead={recordView}
                  />
                ))}
                {current.hasMore && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-lg border border-border bg-surface-raised px-5 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                    {loadMoreError && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Couldn&apos;t load more. Try again.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function UniLibraryPage() {
  // useSearchParams needs a Suspense boundary for the static shell
  return (
    <Suspense fallback={null}>
      <UniLibraryFeed />
    </Suspense>
  );
}
