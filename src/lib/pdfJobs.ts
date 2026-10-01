// src/lib/pdfJobs.ts
// The PDF worker's side of the app (worker: services/pdf-worker).
//
// Every new Backblaze PDF is queued (Book.pdfJob). The worker polls
// POST /api/internal/pdf-jobs/claim for the oldest job, takes a lease on it,
// renders page images into B2 (pages/<bookId>/<n>.webp) and, for platform
// files only, re-compresses the PDF with Ghostscript in place. It reports to
// POST /api/internal/pdf-jobs/[id]/complete. A job whose lease runs out (the
// worker crashed or was redeployed) is claimed again; after MAX_ATTEMPTS it's
// marked failed. Nothing is lost if the worker is down: jobs just wait.
//
// Requests are signed with HMAC-SHA256 over "<timestamp>.<body>" using
// PDF_WORKER_SECRET, which both sides share. Without the secret the internal
// routes are switched off (503); jobs still queue up for when it's set.
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { IPdfJob } from "@/lib/models/bookModel";

export const PDF_JOB_LEASE_MS = 30 * 60 * 1000;
export const PDF_JOB_MAX_ATTEMPTS = 3;
/** Signed requests older (or newer) than this are refused, so they can't be replayed later. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const SIGNATURE_HEADER = "x-worker-signature";
export const TIMESTAMP_HEADER = "x-worker-timestamp";

/** The pdfJob to set on a newly stored Backblaze PDF. */
export function newPdfJob(compress: boolean): IPdfJob {
  return { status: "queued", compress, attempts: 0, queuedAt: new Date() };
}

export const pageImagePrefix = (bookId: string) => `pages/${bookId}/`;
export const pageImageKey = (bookId: string, page: number) => `${pageImagePrefix(bookId)}${page}.webp`;

export function workerSecret(): string | null {
  const secret = process.env.PDF_WORKER_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function signWorkerBody(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export type WorkerAuth = { ok: true; body: string } | { ok: false; status: number; message: string };

/** Reads the raw body and checks the worker's signature and timestamp. */
export async function verifyWorkerRequest(request: NextRequest): Promise<WorkerAuth> {
  const secret = workerSecret();
  if (!secret) return { ok: false, status: 503, message: "The PDF worker isn't configured." };

  const body = await request.text();
  const timestamp = request.headers.get(TIMESTAMP_HEADER) ?? "";
  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 401, message: "Stale or missing timestamp." };
  }
  const expected = signWorkerBody(secret, timestamp, body);
  const valid =
    /^[a-f0-9]{64}$/.test(signature) &&
    crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  return valid ? { ok: true, body } : { ok: false, status: 401, message: "Bad signature." };
}
