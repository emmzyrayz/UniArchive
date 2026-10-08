// src/lib/scouts/streaks.ts
// Scout streaks: a Lagos calendar day counts when the person answers at
// least STREAK_TASKS_PER_DAY Scout tasks (voted answers plus Help identify
// suggestions). The streak is the run of counted days ending today, or
// yesterday while today isn't done yet (so it doesn't reset at midnight).
// A longer streak multiplies what Scout tasks pay; the multiplier is taken
// when someone answers and applied when the answer is paid.
import { Types } from "mongoose";
import { readingDay } from "@/lib/readingStats";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";

export const STREAK_TASKS_PER_DAY = 3;

/** Highest first: the first one reached applies. */
export const STREAK_MULTIPLIERS = [
  { days: 14, multiplier: 1.5 },
  { days: 7, multiplier: 1.25 },
  { days: 3, multiplier: 1.1 },
] as const;

// How far back streaks are worked out
const LOOKBACK_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

export function multiplierFor(streak: number): number {
  return STREAK_MULTIPLIERS.find((m) => streak >= m.days)?.multiplier ?? 1;
}

/** The next milestone above `streak`, if any. */
export function nextMilestone(streak: number): { days: number; multiplier: number } | null {
  const ahead = [...STREAK_MULTIPLIERS].reverse().find((m) => streak < m.days);
  return ahead ? { days: ahead.days, multiplier: ahead.multiplier } : null;
}

export interface StreakState {
  /** Days in a row ending today (or yesterday while today isn't done) */
  current: number;
  /** Longest run in the lookback window */
  best: number;
  /** Tasks done today */
  today: number;
  perDay: number;
  /** Today already counts */
  todayDone: boolean;
  /** What answers given now are multiplied by */
  multiplier: number;
  next: { days: number; multiplier: number } | null;
}

/**
 * Works the streak out from tasks per day ("YYYY-MM-DD" -> count). `covered`
 * days count even without tasks (streak freezes, later). Pure.
 */
export function streakFrom(counts: Map<string, number>, now = new Date(), covered: Set<string> = new Set()): StreakState {
  const done = (day: string) => (counts.get(day) ?? 0) >= STREAK_TASKS_PER_DAY || covered.has(day);
  const todayKey = readingDay(now);
  const today = counts.get(todayKey) ?? 0;

  let cursor = done(todayKey) ? now : new Date(now.getTime() - DAY_MS);
  let current = 0;
  while (current < LOOKBACK_DAYS && done(readingDay(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  // Longest run: walk the window oldest to newest
  let best = 0;
  let run = 0;
  for (let i = LOOKBACK_DAYS; i >= 0; i--) {
    if (done(readingDay(new Date(now.getTime() - i * DAY_MS)))) best = Math.max(best, ++run);
    else run = 0;
  }

  return {
    current,
    best: Math.max(best, current),
    today,
    perDay: STREAK_TASKS_PER_DAY,
    todayDone: done(todayKey),
    multiplier: multiplierFor(current),
    next: nextMilestone(current),
  };
}

/** Scout tasks per Lagos day over the lookback window. */
export async function scoutDayCounts(userId: string | Types.ObjectId, now = new Date()): Promise<Map<string, number>> {
  const id = new Types.ObjectId(String(userId));
  const since = new Date(now.getTime() - (LOOKBACK_DAYS + 1) * DAY_MS);
  const byDay = [
    { $match: { userId: id, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Africa/Lagos" } }, n: { $sum: 1 } } },
  ];
  const [answers, suggestions] = await Promise.all([
    (await getScoutAnswerModel()).aggregate<{ _id: string; n: number }>(byDay),
    (await getMaterialSuggestionModel()).aggregate<{ _id: string; n: number }>(byDay),
  ]);
  const counts = new Map<string, number>();
  for (const r of [...answers, ...suggestions]) counts.set(r._id, (counts.get(r._id) ?? 0) + r.n);
  return counts;
}

export async function scoutStreak(userId: string | Types.ObjectId, now = new Date()): Promise<StreakState> {
  return streakFrom(await scoutDayCounts(userId, now), now);
}
