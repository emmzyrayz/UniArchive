// src/lib/trendingScore.ts
// Time-decayed engagement: materials that drew engagement soon after being
// published outrank ones with more engagement spread over a long time.

/**
 * Score = (views + reactions*3 + downloads*2) / age_hours^1.5
 *
 * The age penalty (^1.5) makes newer material with the same engagement rank
 * higher. Reactions count 3x (a deliberate, high-intent signal); downloads
 * 2x (stronger than a passive view). Age is floored at one hour so a brand
 * new material doesn't divide by ~0.
 */
export function calculateTrendingScore(
  material: {
    viewCount?: number;
    downloadCount?: number;
    reactionCount?: number;
    createdAt: Date | string;
  },
  now: number = Date.now(),
): number {
  const ageHours = Math.max(1, (now - new Date(material.createdAt).getTime()) / (1000 * 60 * 60));
  const engagement =
    (material.viewCount ?? 0) + (material.reactionCount ?? 0) * 3 + (material.downloadCount ?? 0) * 2;
  return engagement / Math.pow(ageHours, 1.5);
}
