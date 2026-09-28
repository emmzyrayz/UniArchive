// src/components/dashboard/ReadingStatsCard.tsx
// The dashboard's reading totals. Until the user has read anything (or if
// the stats can't load) it shows the original placeholder instead.
"use client";

import { useEffect, useState } from "react";
import type { ReadingStats } from "@/types/dashboard";

type State = { status: "loading" } | { status: "empty" } | { status: "ready"; stats: ReadingStats };

function formatTime(stats: ReadingStats): string {
  if (stats.totalTimeMinutes < 60) {
    return `${stats.totalTimeMinutes} minute${stats.totalTimeMinutes === 1 ? "" : "s"}`;
  }
  return `${stats.totalTimeHours} hour${stats.totalTimeHours === 1 ? "" : "s"}`;
}

export function ReadingStatsCard() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/reading-stats", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/user/reading-stats ${res.status}`);
        const stats = (await res.json()) as ReadingStats;
        if (!cancelled) {
          setState(stats.totalPagesRead > 0 ? { status: "ready", stats } : { status: "empty" });
        }
      })
      .catch((error) => {
        console.error("Failed to load reading stats:", error);
        if (!cancelled) setState({ status: "empty" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-surface-raised" />;
  }
  if (state.status === "empty") {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-text-muted text-sm">
          Reading stats coming soon — start reading to track your progress.
        </p>
      </div>
    );
  }

  const { stats } = state;
  const rows: [string, string][] = [
    ["Pages read", stats.totalPagesRead.toLocaleString()],
    ["Time spent", formatTime(stats)],
    ["Books started", stats.booksStarted.toLocaleString()],
    ["Books completed", stats.booksCompleted.toLocaleString()],
    [
      "Current streak",
      stats.currentStreak > 0
        ? `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}${stats.currentStreak >= 2 ? " 🔥" : ""}`
        : "—",
    ],
    ["Bookmarks", stats.totalBookmarks.toLocaleString()],
    ["Highlights", stats.totalHighlights.toLocaleString()],
  ];

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5" aria-labelledby="reading-stats-heading">
      <h3 id="reading-stats-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Reading stats
      </h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="text-lg font-semibold text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
