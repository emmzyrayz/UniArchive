// src/config.ts
// Settings, from the environment. The Backblaze variables have the same
// names as in the app's .env, so both can share one set of values.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive number`);
  return n;
}

/**
 * A command plus fixed leading arguments: "gs", "node shim.mjs", or, when a
 * path has spaces, a JSON array like ["C:/Program Files/gs/bin/gswin64c.exe"].
 */
function command(name: string, fallback: string): string[] {
  const raw = process.env[name]?.trim() || fallback;
  if (raw.startsWith("[")) {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((p) => typeof p === "string")) {
      throw new Error(`${name} must be a command or a JSON array of strings`);
    }
    return parsed;
  }
  return raw.split(/\s+/);
}

export interface Config {
  appUrl: string;
  secret: string;
  b2: { keyId: string; key: string; bucket: string; endpoint: string; region: string };
  gs: string[];
  pdftoppm: string[];
  pdfinfo: string[];
  pageWidth: number;
  webpQuality: number;
  /** Pages rendered per pdftoppm run, which bounds the temp disk used. */
  pageBatch: number;
  pollMs: number;
  /** Keep a compressed PDF only when it's at least this much smaller (0.1 = 10%). */
  minSaving: number;
  workDir: string;
}

export function loadConfig(): Config {
  const secret = required("PDF_WORKER_SECRET");
  if (secret.length < 32) throw new Error("PDF_WORKER_SECRET must be at least 32 characters");
  const endpoint = required("BACKBLAZE_ENDPOINT").replace(/^https?:\/\//, "");
  return {
    appUrl: required("APP_URL").replace(/\/+$/, ""),
    secret,
    b2: {
      keyId: required("BACKBLAZE_KEY_ID"),
      key: required("BACKBLAZE_APPLICATION_KEY"),
      bucket: required("BACKBLAZE_BUCKET_NAME"),
      endpoint,
      region:
        process.env.BACKBLAZE_REGION?.trim() || endpoint.match(/^s3\.([^.]+)\./)?.[1] || "us-west-004",
    },
    gs: command("GS_COMMAND", "gs"),
    pdftoppm: command("PDFTOPPM_COMMAND", "pdftoppm"),
    pdfinfo: command("PDFINFO_COMMAND", "pdfinfo"),
    pageWidth: number("PAGE_WIDTH", 1000),
    webpQuality: number("WEBP_QUALITY", 70),
    pageBatch: number("PAGE_BATCH", 20),
    pollMs: number("POLL_MS", 15_000),
    minSaving: number("MIN_SAVING", 0.1),
    workDir: process.env.WORK_DIR?.trim() || "/tmp",
  };
}
