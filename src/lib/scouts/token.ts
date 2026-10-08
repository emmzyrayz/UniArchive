// src/lib/scouts/token.ts
// A signed task ticket: the server hands one out with each task, and an
// answer is only taken with a valid one for that person, task and subject,
// sent between MIN_SECONDS (time to actually look) and TOKEN_TTL_SECONDS
// after it was issued. Key derived from JWT_SECRET.
import crypto from "crypto";
import { MIN_SECONDS, TOKEN_TTL_SECONDS, isVotedTask, type VotedTask } from "./taskTypes";

function key(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters");
  return crypto.createHmac("sha256", secret).update("uniarchive:scout-task:v1").digest();
}

const sign = (payload: string) => crypto.createHmac("sha256", key()).update(payload).digest("base64url");

export function issueTaskToken(userId: string, task: VotedTask, subjectId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, t: task, s: subjectId, i: Math.floor(now / 1000) })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck =
  | { ok: true; task: VotedTask; subjectId: string }
  | { ok: false; reason: "invalid" | "too_soon" | "expired" };

export function checkTaskToken(token: unknown, userId: string, now = Date.now()): TokenCheck {
  if (typeof token !== "string" || token.length > 600) return { ok: false, reason: "invalid" };
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };
  let data: { u?: unknown; t?: unknown; s?: unknown; i?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (data.u !== userId || !isVotedTask(data.t) || typeof data.s !== "string" || typeof data.i !== "number") {
    return { ok: false, reason: "invalid" };
  }
  const age = now / 1000 - data.i;
  if (age < MIN_SECONDS) return { ok: false, reason: "too_soon" };
  if (age > TOKEN_TTL_SECONDS) return { ok: false, reason: "expired" };
  return { ok: true, task: data.t, subjectId: data.s };
}
