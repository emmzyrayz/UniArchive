// src/lib/readingStats.ts
// Calendar days for reading streaks. Days are counted in Nigerian time
// (Africa/Lagos), so reading at 00:30 counts for the new day there rather
// than the previous UTC day.
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" for `date` in Africa/Lagos. */
export const readingDay = (date: Date = new Date()): string => DAY_FORMAT.format(date);

const MAX_STREAK_DAYS = 3650;

/**
 * Consecutive days with reading, ending today, or yesterday if nothing has
 * been read yet today (so a streak doesn't reset first thing in the morning).
 */
export function calculateStreak(days: Iterable<string>, now: Date = new Date()): number {
  const set = new Set(days);
  if (set.size === 0) return 0;

  const dayBefore = (d: Date) => new Date(d.getTime() - 24 * 60 * 60 * 1000);
  let cursor = set.has(readingDay(now)) ? now : dayBefore(now);
  let streak = 0;
  while (streak < MAX_STREAK_DAYS && set.has(readingDay(cursor))) {
    streak++;
    cursor = dayBefore(cursor);
  }
  return streak;
}
