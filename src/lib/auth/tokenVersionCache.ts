// src/lib/auth/tokenVersionCache.ts
// A copy of each user's tokenVersion in Redis ("tv:<userId>"), so the proxy
// can spot a revoked JWT without touching MongoDB. The database stays the
// source of truth: /api/auth/refresh re-syncs this from it, so a stale or
// missing key can never lock anyone out. Both helpers swallow Redis errors:
// the proxy check is an extra layer on top of the per-request session check.
import { redis } from "@/lib/redis";

// Matches the session lifetime (SESSION_TTL_HOURS)
const TTL_SECONDS = 7 * 24 * 60 * 60;

const key = (userId: string) => `tv:${userId}`;

export async function cacheTokenVersion(userId: string, tokenVersion: number): Promise<void> {
  try {
    await redis.set(key(userId), String(tokenVersion), { ex: TTL_SECONDS });
  } catch (error) {
    console.error("tokenVersion cache write failed:", error);
  }
}

/** The cached version, or null when there's none (or Redis is unreachable). */
export async function getCachedTokenVersion(userId: string): Promise<number | null> {
  try {
    const value = await redis.get<string | number>(key(userId));
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isInteger(n) ? n : null;
  } catch (error) {
    console.error("tokenVersion cache read failed:", error);
    return null;
  }
}
