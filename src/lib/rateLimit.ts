// src/lib/rateLimit.ts
// Fixed-window, in-memory rate limiter. Good enough for a single server or
// local development; on serverless each instance keeps its own counters, so
// replace with a shared store (e.g. Upstash Redis) before relying on it in
// production.
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/api";

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Throws a 429 Response when the caller's IP exceeds the limit for `name`. */
export function enforceRateLimit(
  request: NextRequest,
  name: string,
  limit: number,
  windowMs = 60_000,
): void {
  const { allowed, retryAfterSeconds } = rateLimit(
    `${name}:${getClientIp(request)}`,
    limit,
    windowMs,
  );
  if (!allowed) {
    throw NextResponse.json(
      { message: "Too many requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }
}
