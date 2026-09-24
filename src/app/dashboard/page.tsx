// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StorageUsage } from "@/components/dashboard/StorageUsage";
import { Button } from "@/components/UI/Buttons";
import { formatBytes } from "@/assets/data/dashboardData";
import type { Book } from "@/types/library";

type Tab = "overview" | "bookmarks" | "highlights" | "storage";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "highlights", label: "Highlights" },
  { id: "storage", label: "Storage" },
];

// Flat quota until storage tiers exist
const STORAGE_TOTAL_BYTES = 524_288_000;

interface UserStats {
  documentCount: number;
  totalStorageBytes: number;
  recentBooks: Book[];
}

type StatsState =
  | { status: "loading" }
  | { status: "ready"; stats: UserStats }
  | { status: "error" };

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-text-muted text-sm">{children}</p>
    </div>
  );
}

function RecentBooks({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <EmptyState>Nothing opened yet — books you read will show up here.</EmptyState>;
  }
  return (
    <ul className="rounded-xl border border-border bg-surface-raised divide-y divide-border">
      {books.map((book) => (
        <li key={book.id}>
          <Link
            href={`/read/${book.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-100 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary line-clamp-1">{book.title}</span>
            {book.lastOpenedAt && (
              <span className="text-xs text-text-muted shrink-0">
                {new Date(book.lastOpenedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasActiveSession, isLoading } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [statsState, setStatsState] = useState<StatsState>({ status: "loading" });
  // Bumped by the retry button to re-run the fetch without a full page reload
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  useEffect(() => {
    if (isLoading || !hasActiveSession) return;
    let cancelled = false;

    fetch("/api/user/stats", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GET /api/user/stats ${response.status}`);
        const stats = (await response.json()) as UserStats;
        if (!cancelled) setStatsState({ status: "ready", stats });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load dashboard stats:", error);
        setStatsState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, hasActiveSession, reloadKey]);

  if (isLoading || !hasActiveSession) return null;

  const stats = statsState.status === "ready" ? statsState.stats : null;
  const storage = stats && {
    usedBytes: stats.totalStorageBytes,
    totalBytes: STORAGE_TOTAL_BYTES,
    documentCount: stats.documentCount,
  };

  const statsFallback =
    statsState.status === "error" ? (
      <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-text-muted text-sm">
          We couldn&apos;t load your stats. Check your connection and try again.
        </p>
        <Button
          onClick={() => {
            setStatsState({ status: "loading" });
            setReloadKey((k) => k + 1);
          }}
        >
          Retry
        </Button>
      </div>
    ) : (
      <EmptyState>Loading…</EmptyState>
    );

  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your reading activity and saved content
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8 overflow-x-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {stats && storage ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatsCard
                    label="Documents"
                    value={stats.documentCount}
                    display={stats.documentCount.toLocaleString()}
                    icon={<BookIcon />}
                    delay={0}
                  />
                  <StatsCard
                    label="Storage used"
                    value={stats.totalStorageBytes}
                    display={formatBytes(stats.totalStorageBytes)}
                    icon={<DatabaseIcon />}
                    delay={0.08}
                  />
                </div>

                <EmptyState>
                  Reading stats coming soon — start reading to track your progress.
                </EmptyState>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.16 }}
                  >
                    <h3 className="font-semibold text-text-primary mb-4">Continue reading</h3>
                    <RecentBooks books={stats.recentBooks} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.24 }}
                  >
                    <StorageUsage storage={storage} />
                  </motion.div>
                </div>
              </>
            ) : (
              statsFallback
            )}
          </div>
        )}

        {/* Bookmarks tab - bookmarks aren't persisted yet */}
        {activeTab === "bookmarks" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <EmptyState>No bookmarks yet — bookmark pages while reading to see them here</EmptyState>
          </motion.div>
        )}

        {/* Highlights tab - highlights aren't persisted yet */}
        {activeTab === "highlights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <EmptyState>No highlights yet — drag to highlight text while reading</EmptyState>
          </motion.div>
        )}

        {/* Storage tab */}
        {activeTab === "storage" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg"
          >
            {storage ? <StorageUsage storage={storage} /> : statsFallback}
          </motion.div>
        )}
      </div>
    </div>
  );
}
