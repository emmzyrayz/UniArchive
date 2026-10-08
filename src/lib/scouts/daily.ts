// src/lib/scouts/daily.ts
// The daily Archive Scouts job (/api/cron/scouts, 17:00 UTC = 18:00 in
// Lagos): reminds everyone with a streak of STREAK_REMINDER_FROM days or
// more who hasn't done today's tasks yet that it ends at midnight. Later
// steps add streak freezes and closing the week's leaderboards here.
import { Types } from "mongoose";
import { readingDay } from "@/lib/readingStats";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { notify } from "@/lib/notifications";
import { scoutStreak } from "./streaks";

export const STREAK_REMINDER_FROM = 3;
// Most people checked per run (the job has a time budget too)
const MAX_PEOPLE = 5000;

export interface ScoutsDailyResult {
  day: string;
  checked: number;
  reminded: number;
  timedOut: boolean;
}

/** People who did Scout tasks yesterday or today: the only ones whose streak can be alive. */
async function recentScouts(now: Date): Promise<Types.ObjectId[]> {
  const since = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const [answers, suggestions] = await Promise.all([
    (await getScoutAnswerModel()).distinct("userId", { createdAt: { $gte: since } }),
    (await getMaterialSuggestionModel()).distinct("userId", { createdAt: { $gte: since } }),
  ]);
  const ids = new Map<string, Types.ObjectId>();
  for (const id of [...answers, ...suggestions] as Types.ObjectId[]) ids.set(String(id), id);
  return [...ids.values()].slice(0, MAX_PEOPLE);
}

export async function runScoutsDaily(now = new Date(), budgetMs = 240_000): Promise<ScoutsDailyResult> {
  const started = Date.now();
  const day = readingDay(now);
  const people = await recentScouts(now);
  let checked = 0;
  let reminded = 0;
  let timedOut = false;
  for (const userId of people) {
    if (Date.now() - started > budgetMs) {
      timedOut = true;
      break;
    }
    checked++;
    const s = await scoutStreak(userId, now);
    if (s.current < STREAK_REMINDER_FROM || s.todayDone) continue;
    const left = s.perDay - s.today;
    const sent = await notify(userId, {
      type: "streak_risk",
      title: `Your ${s.current}-day Scout streak ends at midnight`,
      body: `Do ${left} more Scout task${left === 1 ? "" : "s"} today to keep it${s.multiplier > 1 ? ` and your ×${s.multiplier} bonus` : ""}.`,
      link: "/scouts",
      dedupeKey: `streak-risk:${day}`,
    });
    if (sent) reminded++;
  }
  return { day, checked, reminded, timedOut };
}
