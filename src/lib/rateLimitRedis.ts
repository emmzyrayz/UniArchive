// src/lib/rateLimitRedis.ts
// Rate limiting shared across every server instance, backed by Upstash
// Redis (sliding windows). Replaces the old per-instance in-memory limiter.
//
// Each route passes its own identifier ("login:<ip>", "admin-users:<userId>")
// so routes of the same type don't share one budget.
//
// If Redis is slow or unreachable the request is allowed: an outage should
// cost us rate limiting, not the whole API.
import { Ratelimit } from "@upstash/ratelimit";
import type { NextRequest } from "next/server";
import { redis } from "./redis";
import { getClientIp } from "./api";

// Give up on Redis after this long and let the request through
const TIMEOUT_MS = 1000;

const make = (tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    timeout: TIMEOUT_MS,
  });

// Pre-configured limiters for different route types
const limiters = {
  // Standard API endpoints — most routes
  standard: make(60, "1 m", "rl:standard"),
  // Auth routes — stricter (login, verify, reset)
  auth: make(10, "1 m", "rl:auth"),
  // Routes that create accounts or send email (register, reset request,
  // resend verification): tighter than auth, each one can send an email
  authEmail: make(5, "1 m", "rl:auth-email"),
  // Codes sent to one school email address, whoever asks
  schoolEmail: make(5, "1 h", "rl:school-email"),
  // Upload routes — very expensive
  upload: make(20, "1 h", "rl:upload"),
  // Contact form — strict anti-spam
  contact: make(3, "1 h", "rl:contact"),
  // Gifting PDFs to UniArchive: each one copies a file into platform storage
  gift: make(10, "24 h", "rl:gift"),
  // Google Drive import: reading a shared link's folder, per user
  driveScan: make(30, "1 h", "rl:drive-scan"),
  // Files imported from Drive into a personal library, per student (bytes
  // are capped separately in lib/drive/routeAccess.ts)
  driveImport: make(100, "24 h", "rl:drive-import"),
  // Files staff import from Drive into the platform queue, per staff member
  driveImportStaff: make(1000, "24 h", "rl:drive-import-staff"),
  // Institution suggest — moderate
  suggest: make(3, "24 h", "rl:suggest"),
  // Admin routes — generous
  admin: make(120, "1 m", "rl:admin"),
  // Emails an admin writes to single users (/admin/mail)
  staffMail: make(30, "1 h", "rl:staff-mail"),
  // Broadcasts sent or scheduled through Brevo, per admin
  broadcastSend: make(10, "24 h", "rl:broadcast-send"),
  // "Download my data": reads every collection for the user
  dataExport: make(5, "1 h", "rl:data-export"),
  // Submitting or changing survey answers, per IP (anyone can answer)
  surveyResponse: make(20, "1 h", "rl:survey-response"),
  // Survey result exports (CSV/JSON), per admin
  surveyExport: make(30, "1 h", "rl:survey-export"),
  // Reporting UniLibrary materials, per user
  materialReport: make(20, "24 h", "rl:material-report"),
  // "Help identify this PDF" suggestions, per user
  materialSuggest: make(20, "24 h", "rl:material-suggest"),
  // Posting comments
  comment: make(10, "1 m", "rl:comment"),
  // Public read (materials, profiles) — generous
  public: make(60, "1 m", "rl:public"),
  // Not a throttle: counts one material view per IP per hour
  viewOnce: make(1, "1 h", "rl:view-once"),
} as const;

export type LimiterType = keyof typeof limiters;

let lastErrorLog = 0;

/**
 * Check rate limit for a request. `identifier` should name the route and the
 * caller ("login:" + IP, "admin-users:" + userId); it defaults to the IP.
 */
export async function checkRateLimit(
  request: NextRequest,
  type: LimiterType = "standard",
  identifier?: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const id = identifier ?? getClientIp(request);
  try {
    const result = await limiters[type].limit(id);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch (error) {
    // Fail open, but don't flood the logs during an outage
    if (Date.now() - lastErrorLog > 60_000) {
      lastErrorLog = Date.now();
      console.error("Rate limiter unavailable, allowing requests:", error);
    }
    return { success: true, remaining: -1, reset: Date.now() };
  }
}

/**
 * Returns a 429 Response with retry-after header.
 * Use this when checkRateLimit returns success: false.
 */
export function rateLimitResponse(reset: number): Response {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(JSON.stringify({ message: "Too many requests. Please slow down." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
      "X-RateLimit-Reset": String(reset),
    },
  });
}

/**
 * checkRateLimit, throwing the 429 Response when over the limit. Route
 * handlers already turn thrown Responses into replies (handleRouteError),
 * the same way requireAuth's 401 works.
 */
export async function enforceRateLimit(
  request: NextRequest,
  type: LimiterType,
  identifier?: string,
): Promise<void> {
  const { success, reset } = await checkRateLimit(request, type, identifier);
  if (!success) throw rateLimitResponse(reset);
}
