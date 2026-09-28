// src/lib/redis.ts
// Upstash Redis over its REST API: shared rate limit counters, and the
// tokenVersion cache the proxy checks. Works in the proxy and route handlers.
import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL");
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing UPSTASH_REDIS_REST_TOKEN");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
