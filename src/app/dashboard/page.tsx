// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StorageUsage } from "@/components/dashboard/StorageUsage";
import { BookmarksList } from "@/components/dashboard/BookmarksList";
import { HighlightsList } from "@/components/dashboard/HighlightsList";
import {
  MOCK_READING_STATS,
  MOCK_BOOKMARKS,
  MOCK_HIGHLIGHTS,
  MOCK_STORAGE,
  formatDuration,
} from "@/assets/data/dashboardData";

type Tab = "overview" | "bookmarks" | "highlights" | "storage";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bookmarks", label: `Bookmarks (${MOCK_BOOKMARKS.length})` },
  { id: "highlights", label: `Highlights (${MOCK_HIGHLIGHTS.length})` },
  { id: "storage", label: "Storage" },
];

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 14.5A2.5 2.5 0 0011 17h2a2.5 2.5 0 002.5-2.5c0-1.5-.5-2-1-3s-.5-2.5.5-3.5c0 2 1.5 2.5 2 4s.5 3-1 4.5c-1 1-2 1.5-4 1.5s-3-.5-4-1.5c-1.5-1.5-2-3-1-4.5s2-2 2-4c1 1 1.5 2.5.5 3.5z" />
    </svg>
  );
}
function PageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, getUserDisplayName } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  if (isLoading || !hasActiveSession) return null;

  const stats = MOCK_READING_STATS;

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatsCard
                label="Pages read"
                value={stats.totalPagesRead}
                display={stats.totalPagesRead.toLocaleString()}
                icon={<PageIcon />}
                delay={0}
              />
              <StatsCard
                label="Time reading"
                value={stats.totalTimeSpentMinutes}
                display={formatDuration(stats.totalTimeSpentMinutes)}
                icon={<ClockIcon />}
                delay={0.08}
              />
              <StatsCard
                label="Completed"
                value={stats.documentsCompleted}
                display={`${stats.documentsCompleted} docs`}
                icon={<BookIcon />}
                delay={0.16}
              />
              <StatsCard
                label="Current streak"
                value={stats.currentStreakDays}
                display={`${stats.currentStreakDays} days 🔥`}
                icon={<FlameIcon />}
                delay={0.24}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.32 }}
                className="rounded-xl border border-border bg-surface-raised p-6"
              >
                <h3 className="font-semibold text-text-primary mb-4">Reading details</h3>
                <dl className="space-y-3">
                  {[
                    { label: "Longest streak", value: `${stats.longestStreakDays} days` },
                    { label: "Avg session", value: formatDuration(stats.averageSessionMinutes) },
                    { label: "Bookmarks saved", value: MOCK_BOOKMARKS.length },
                    { label: "Highlights made", value: MOCK_HIGHLIGHTS.length },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <dt className="text-sm text-text-secondary">{item.label}</dt>
                      <dd className="text-sm font-medium text-text-primary">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <StorageUsage storage={MOCK_STORAGE} />
              </motion.div>
            </div>

            {/* Recent bookmarks preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary">Recent bookmarks</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("bookmarks")}
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </button>
              </div>
              <BookmarksList bookmarks={MOCK_BOOKMARKS.slice(0, 2)} />
            </div>
          </div>
        )}

        {/* Bookmarks tab */}
        {activeTab === "bookmarks" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <BookmarksList bookmarks={MOCK_BOOKMARKS} />
          </motion.div>
        )}

        {/* Highlights tab */}
        {activeTab === "highlights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <HighlightsList highlights={MOCK_HIGHLIGHTS} />
          </motion.div>
        )}

        {/* Storage tab */}
        {activeTab === "storage" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg"
          >
            <StorageUsage storage={MOCK_STORAGE} />
          </motion.div>
        )}
      </div>
    </div>
  );
}