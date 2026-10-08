// src/lib/scouts/streaks.ts
// Scout streaks: a Lagos calendar day counts when the person answers at
// least STREAK_TASKS_PER_DAY Scout tasks (voted answers plus Help identify
// suggestions). The streak is the run of counted days ending today, or
// yesterday while today isn't done yet (so it doesn't reset at midnight).
// A longer streak multiplies what Scout tasks pay; the multiplier is taken
// when someone answers and applied when the answer is paid.
//
// Bought protection (ScoutStreak): a held freeze covers a missed day
// automatically the next time the streak is read (here, so every caller
// and the daily job apply it); a repair covers one recent missed day.
import { Types } from "mongoose";
import { readingDay } from "@/lib/readingStats";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { COVERED_KEEP, getScoutStreakModel, type IScoutStreak } from "@/lib/models/scoutStreakModel";
import { notify } from "@/lib/notifications";

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

// ---------------------------------------------------------------- protection

/** A repair must have the streak it restores at least this long. */
export const REPAIR_MIN_STREAK = 3;
export const REPAIR_EVERY_DAYS = 30;

const dayBefore = (d: Date) => new Date(d.getTime() - DAY_MS);
const isDone = (counts: Map<string, number>, covered: Set<string>, day: string) =>
  (counts.get(day) ?? 0) >= STREAK_TASKS_PER_DAY || covered.has(day);

/** Days in a row ending on `from` (inclusive). */
function runEnding(counts: Map<string, number>, covered: Set<string>, from: Date): number {
  let n = 0;
  let cursor = from;
  while (n < LOOKBACK_DAYS && isDone(counts, covered, readingDay(cursor))) {
    n++;
    cursor = dayBefore(cursor);
  }
  return n;
}

/**
 * The missed days a held freeze should cover now: the gap ending yesterday,
 * when a done day comes before it and the gap is no longer than `held`.
 * Today is still open, so it's never covered. Pure.
 */
export function freezePlan(counts: Map<string, number>, covered: Set<string>, held: number, now = new Date()): string[] {
  if (held <= 0) return [];
  const gap: string[] = [];
  let cursor = dayBefore(now);
  while (!isDone(counts, covered, readingDay(cursor))) {
    gap.push(readingDay(cursor));
    if (gap.length > held) return [];
    cursor = dayBefore(cursor);
  }
  return gap;
}

/**
 * A missed day a repair could cover: one missed day, yesterday or the day
 * before (with yesterday done), after a run of REPAIR_MIN_STREAK or more.
 * `restoresTo` is the streak once it's covered. Pure.
 */
export function repairOption(
  counts: Map<string, number>,
  covered: Set<string>,
  now = new Date(),
): { day: string; restoresTo: number } | null {
  const yesterday = dayBefore(now);
  const twoAgo = dayBefore(yesterday);
  let missed: Date | null = null;
  if (!isDone(counts, covered, readingDay(yesterday))) missed = yesterday;
  else if (!isDone(counts, covered, readingDay(twoAgo))) missed = twoAgo;
  if (!missed) return null;
  if (runEnding(counts, covered, dayBefore(missed)) < REPAIR_MIN_STREAK) return null;
  const day = readingDay(missed);
  const withRepair = new Set(covered).add(day);
  return { day, restoresTo: streakFrom(counts, now, withRepair).current };
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

export interface ScoutStreakInfo extends StreakState {
  /** Freezes held */
  freezes: number;
  /** A repair on offer, if the streak just broke */
  repair: { day: string; restoresTo: number } | null;
  /** When the last repair was bought (one every REPAIR_EVERY_DAYS) */
  lastRepairAt: string | null;
}

/** The streak, after using any held freezes on a gap ending yesterday. */
export async function scoutStreak(userId: string | Types.ObjectId, now = new Date()): Promise<ScoutStreakInfo> {
  const id = new Types.ObjectId(String(userId));
  const [counts, state] = await Promise.all([
    scoutDayCounts(id, now),
    (await getScoutStreakModel()).findOne({ userId: id }).lean<IScoutStreak>(),
  ]);
  const covered = new Set((state?.covered ?? []).map((c) => c.day));
  let freezes = state?.freezes ?? 0;

  const plan = freezePlan(counts, covered, freezes, now);
  if (plan.length) {
    const used = await (await getScoutStreakModel()).updateOne(
      { userId: id, freezes: { $gte: plan.length }, "covered.day": { $nin: plan } },
      {
        $inc: { freezes: -plan.length },
        $push: { covered: { $each: plan.map((day) => ({ day, kind: "freeze", at: now })), $slice: -COVERED_KEEP } },
        $set: { updatedAt: now },
      },
    );
    if (used.modifiedCount === 1) {
      for (const day of plan) covered.add(day);
      freezes -= plan.length;
      const saved = streakFrom(counts, now, covered).current;
      await notify(id, {
        type: "streak_saved",
        title: `A streak freeze saved your ${saved}-day streak`,
        body: `${plan.length === 1 ? "A freeze" : `${plan.length} freezes`} covered the day${plan.length === 1 ? "" : "s"} you missed. ${
          freezes > 0 ? `You have ${freezes} left.` : "You have none left: get another in the Scouts shop."
        }`,
        link: "/scouts",
        dedupeKey: `freeze:${plan.join(",")}`,
      });
    }
  }

  const lastRepair = (state?.covered ?? []).filter((c) => c.kind === "repair").sort((a, b) => +new Date(b.at) - +new Date(a.at))[0];
  return {
    ...streakFrom(counts, now, covered),
    freezes,
    repair: repairOption(counts, covered, now),
    lastRepairAt: lastRepair ? new Date(lastRepair.at).toISOString() : null,
  };
}
