// src/lib/auth/tokens.ts
// Generation and comparison of one-time codes and tokens. Raw values are only
// ever emailed or sent to the browser; the database stores hashes.
import crypto from "crypto";
import { hashForSearch } from "@/lib/encryption";

export const OTP_TTL_MS = 15 * 60 * 1000;
export const RESET_LINK_TTL_MS = 60 * 60 * 1000;
export const RESET_SESSION_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

/** Six-digit code, uniformly distributed over 100000-999999. */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/** 32 random bytes as hex. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Codes are short, so they are hashed with the server-side HASH_SALT. */
export function hashOtp(code: string): string {
  return hashForSearch(code);
}

/** Long random tokens don't need a salt; plain SHA-256 is enough. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pads a response to a minimum duration so that "account exists" and
 * "account doesn't exist" paths take roughly the same time.
 */
export async function withMinimumDuration<T>(
  work: Promise<T>,
  minimumMs = 300,
): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, minimumMs)),
  ]);
  return result;
}
