// components/scouts/ScoutsHub.tsx
// /scouts: the Archive Scouts home. Wallet (AC, level, today's earnings
// against the daily cap), the three task types with how many are waiting
// and how the person is doing, their latest credits, and how it works.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WalletSummary, HistoryItem } from "@/lib/economy/wallet";
import type { ScoutTaskSummary } from "@/lib/scouts/engine";
import type { StreakState } from "@/lib/scouts/streaks";
import { SCOUT_TASKS } from "@/lib/scouts/taskTypes";
import { MIN_ACCURACY, MIN_SETTLED, AGREE } from "@/lib/scouts/taskTypes";
import { timeAgo } from "@/components/notifications/notificationClient";

interface Summary {
  wallet: WalletSummary;
  tasks: ScoutTaskSummary[];
  streak: StreakState;
  waitingCap: number;
}

const fmt = (n: number) => n.toLocaleString("en");

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-2 overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function WalletCard({ wallet }: { wallet: WalletSummary }) {
  const { level, today } = wallet;
  return (
    <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:grid-cols-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Archive Credits</p>
        <p className="mt-1 text-3xl font-bold text-text-primary">
          {fmt(wallet.AC)} <span className="text-base font-semibold text-text-secondary">AC</span>
        </p>
        {wallet.AC < 0 && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Below zero after credits were taken back.</p>}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Level {level.level}</p>
        <p className="mt-1 text-lg font-semibold text-text-primary">{level.title}</p>
        <div className="mt-2">
          <Bar value={level.intoLevel} max={level.levelSpan} label="XP towards the next level" />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {fmt(wallet.XP)} XP{level.levelSpan > 0 && ` · ${fmt(level.levelSpan - level.intoLevel)} to level ${level.level + 1}`}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Today</p>
        <p className="mt-1 text-lg font-semibold text-text-primary">
          {fmt(today.earnedAC)} <span className="text-sm font-normal text-text-secondary">of {fmt(today.capAC)} AC</span>
        </p>
        <div className="mt-2">
          <Bar value={today.earnedAC} max={today.capAC} label="AC earned today out of the daily limit" />
        </div>
        <p className="mt-1 text-xs text-text-muted">The daily limit resets at midnight. XP has no limit.</p>
      </div>
    </section>
  );
}

function StreakCard({ s }: { s: StreakState }) {
  const left = Math.max(0, s.perDay - s.today);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span aria-hidden className={`text-4xl ${s.current > 0 ? "" : "opacity-40 grayscale"}`}>
          🔥
        </span>
        <div>
          <p className="text-lg font-semibold text-text-primary">
            {s.current === 0 ? "No streak yet" : `${s.current}-day streak`}
            {s.multiplier > 1 && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-sm text-primary">×{s.multiplier} credits</span>}
          </p>
          <p className="text-sm text-text-secondary">
            {s.todayDone
              ? "Today counts. Come back tomorrow to keep it going."
              : `${left} more task${left === 1 ? "" : "s"} today ${s.current > 0 ? "to keep it" : "to start one"}.`}
            {s.next && ` ${s.next.days - s.current} day${s.next.days - s.current === 1 ? "" : "s"} more for ×${s.next.multiplier}.`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5" aria-label={`${s.today} of ${s.perDay} tasks today`}>
          {Array.from({ length: s.perDay }, (_, i) => (
            <span key={i} className={`h-3 w-8 rounded-full ${i < s.today ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="text-xs text-text-muted">Best {s.best}</p>
      </div>
    </section>
  );
}

function TaskCard({ t, cap }: { t: ScoutTaskSummary; cap: number }) {
  const def = SCOUT_TASKS[t.task];
  const none = t.waiting === 0;
  const pct = t.accuracy?.rate != null ? Math.round(t.accuracy.rate * 100) : null;
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5">
      <p aria-hidden className="text-3xl">
        {def.icon}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-text-primary">{def.title}</h2>
      <p className="mt-1 flex-1 text-sm text-text-secondary">{def.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">Waiting</dt>
          <dd className="font-semibold text-text-primary">{t.waiting > cap ? `${cap}+` : t.waiting}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">{t.task === "identify" ? "Awaiting staff" : "Awaiting others"}</dt>
          <dd className="font-semibold text-text-primary">{t.pending}</dd>
        </div>
        {t.accuracy && (
          <div className="col-span-2">
            <dt className="text-xs text-text-muted">Agreed with the result</dt>
            <dd className="font-semibold text-text-primary">
              {pct === null ? "Nothing settled yet" : `${pct}% of ${t.accuracy.settled}`}
            </dd>
          </div>
        )}
      </dl>
      {t.accuracy?.paused && (
        <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
          Too many of your answers disagreed with other Scouts, so they don&apos;t count or earn for now. Keep answering
          carefully: they count again once you&apos;re back above {Math.round(MIN_ACCURACY * 100)}%.
        </p>
      )}
      {none ? (
        <p className="mt-4 rounded-lg border border-dashed border-border py-2.5 text-center text-sm text-text-muted">All done for now</p>
      ) : (
        <Link
          href={`/scouts/play?task=${t.task}`}
          className="mt-4 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white hover:bg-primary/90"
        >
          Start
        </Link>
      )}
    </section>
  );
}

export function ScoutsHub() {
  const [data, setData] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const get = async <T,>(url: string) => {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "Couldn't load Scouts.");
      return body as T;
    };
    get<Summary>("/api/scouts/summary")
      .then(setData)
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    get<{ items: HistoryItem[] }>("/api/economy/history")
      .then((h) => setHistory(h.items.slice(0, 6)))
      .catch(() => setHistory([]));
    return () => controller.abort();
  }, []);

  return (
    <main className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Archive Scouts</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Small tasks that keep the UniLibrary accurate. Each takes a minute on your phone, and you earn Archive
            Credits (AC) and XP once your answer is confirmed.
          </p>
        </header>

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {!data && !error && <p className="text-sm text-text-muted">Loading…</p>}

        {data && (
          <>
            <WalletCard wallet={data.wallet} />
            <StreakCard s={data.streak} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.tasks.map((t) => (
                <TaskCard key={t.task} t={t} cap={data.waitingCap} />
              ))}
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="font-semibold text-text-primary">Latest credits</h2>
            {history === null ? (
              <p className="mt-2 text-sm text-text-muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">Nothing yet. Finish a task and it shows here once it&apos;s confirmed.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {history.map((h) => (
                  <li key={h.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className={`min-w-0 ${h.reversed ? "text-text-muted line-through" : "text-text-primary"}`}>
                      {h.title}
                      {h.note && <span className="block text-xs text-text-muted">{h.note}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={h.AC < 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
                        {h.AC > 0 ? "+" : ""}
                        {fmt(h.AC)} AC
                      </span>
                      {h.XP !== 0 && <span className="ml-2 text-text-muted">{h.XP > 0 ? "+" : ""}{fmt(h.XP)} XP</span>}
                      <span className="block text-xs text-text-muted">{timeAgo(h.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
            <h2 className="font-semibold text-text-primary">How it works</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>You only earn for answers that are confirmed: when {AGREE} Scouts agree, or our team accepts your details.</li>
              <li>Answers that disagree earn nothing but cost nothing. Guessing doesn&apos;t pay: after {MIN_SETTLED} answers, if fewer than {Math.round(MIN_ACCURACY * 100)}% agree with the result, yours stop counting for a while.</li>
              <li>You never get tasks on your own uploads or your own typing.</li>
              <li>Credits have no cash value, can&apos;t be sold, and never change your role. If our team later overturns a result, the credits for it are taken back.</li>
              <li>Do 3 tasks a day to build a streak: 3 days in a row earns ×1.1, 7 days ×1.25, 14 days ×1.5 (applied when each answer is paid).</li>
              <li>Coming soon: a shop to spend credits in, and weekly department leaderboards.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
