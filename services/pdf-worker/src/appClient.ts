// src/appClient.ts
// Talks to the app's internal API (src/app/api/internal/pdf-jobs in the
// app). Every request is signed: HMAC-SHA256 of "<timestamp>.<body>" with
// the shared PDF_WORKER_SECRET (the app's lib/pdfJobs.ts checks it).
import crypto from "node:crypto";
import type { Config } from "./config.ts";

export interface Job {
  id: string;
  storageKey: string;
  fileSize: number;
  pageCount: number | null;
  compress: boolean;
  attempt: number;
  leaseMs: number;
}

export type JobResult =
  | { ok: true; pageCount: number; pageImages: { count: number; width: number }; compressedSize?: number }
  | { ok: false; error: string };

async function post<T>(config: Config, path: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = crypto.createHmac("sha256", config.secret).update(`${timestamp}.${body}`).digest("hex");
  const res = await fetch(`${config.appUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Timestamp": timestamp,
      "X-Worker-Signature": signature,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

export async function claimJob(config: Config): Promise<Job | null> {
  const { job } = await post<{ job: Job | null }>(config, "/api/internal/pdf-jobs/claim", {});
  return job;
}

export async function completeJob(config: Config, id: string, result: JobResult): Promise<void> {
  await post(config, `/api/internal/pdf-jobs/${encodeURIComponent(id)}/complete`, result);
}
