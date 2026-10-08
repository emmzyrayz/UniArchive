// src/lib/economy/levels.ts
// Levels from total XP. Pure and client-safe. Each level needs a little more
// XP than the one before: reaching level L takes 40(L-1)^2 + 60(L-1) XP in
// total (level 2 at 100, 5 at 880, 10 at 3,780, 20 at 15,580).
export const MAX_LEVEL = 100;

export const LEVEL_TITLES: { from: number; title: string }[] = [
  { from: 1, title: "Rookie Scout" },
  { from: 5, title: "Scout" },
  { from: 10, title: "Senior Scout" },
  { from: 20, title: "Pathfinder" },
  { from: 30, title: "Archivist" },
  { from: 40, title: "Master Archivist" },
  { from: 60, title: "Legend" },
];

/** Total XP needed to reach `level`. */
export function xpForLevel(level: number): number {
  const n = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)) - 1);
  return 40 * n * n + 60 * n;
}

export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) if (level >= t.from) title = t.title;
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP earned since reaching this level. */
  intoLevel: number;
  /** XP this level spans (0 at the top level). */
  levelSpan: number;
}

export function levelFromXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= total) level++;
  const start = xpForLevel(level);
  return {
    level,
    title: levelTitle(level),
    xp: total,
    intoLevel: total - start,
    levelSpan: level >= MAX_LEVEL ? 0 : xpForLevel(level + 1) - start,
  };
}
