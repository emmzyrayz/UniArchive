// src/lib/auth/deviceRecognition.ts
// Trusted devices and new-device sign-in codes.
//
// A trusted browser holds a random token in the httpOnly `ua_device` cookie
// (TrustedDevice stores its hash). Signing in anywhere else - by password or
// by Google - first needs a 6-digit code emailed to the account.
//
// A pending code ("challenge") lives in Redis for 10 minutes under the hash
// of a random challenge token; the raw token is in the httpOnly
// `ua_device_challenge` cookie, so only the browser that entered the password
// (or finished Google sign-in) can complete it.
import type { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getTrustedDeviceModel } from "@/lib/models/trustedDeviceModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { getClientIp } from "@/lib/api";
import {
  MAX_CODE_ATTEMPTS,
  generateOtp,
  generateToken,
  hashOtp,
  hashToken,
  maskEmailAddress,
  safeEqualHex,
} from "@/lib/auth/tokens";
import { sendDeviceVerificationEmail } from "@/utils/email";

export const DEVICE_COOKIE = "ua_device";
export const DEVICE_TRUST_SECONDS = 30 * 24 * 60 * 60;
export const DEVICE_CHALLENGE_COOKIE = "ua_device_challenge";
export const DEVICE_CHALLENGE_TTL_SECONDS = 10 * 60;
const MAX_CHALLENGE_RESENDS = 3;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** "Chrome on Windows", "Safari on iOS". Order matters: Edge and Chrome UAs
 * also say "Safari", and iPhone UAs also say "Mac OS X". */
export function getDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  let browser = "Unknown browser";
  if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) browser = "Edge";
  else if (ua.includes("opr/") || ua.includes("opera")) browser = "Opera";
  else if (ua.includes("samsungbrowser")) browser = "Samsung Internet";
  else if (ua.includes("firefox") || ua.includes("fxios")) browser = "Firefox";
  else if (ua.includes("chrome") || ua.includes("crios")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";

  let os = "unknown OS";
  if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "Mac";
  else if (ua.includes("cros")) os = "ChromeOS";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}

const userAgentOf = (request: NextRequest) => request.headers.get("user-agent") ?? "";

// ---------------------------------------------------------------------------
// Trusted devices
// ---------------------------------------------------------------------------

export function readDeviceToken(request: NextRequest): string | null {
  const token = request.cookies.get(DEVICE_COOKIE)?.value;
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

/**
 * True when this request carries a live trusted-device token for the user.
 * A hit slides the 30-day expiry forward (call refreshDeviceCookie too).
 */
export async function isDeviceTrusted(userId: string, deviceToken: string | null): Promise<boolean> {
  if (!deviceToken) return false;
  const TrustedDevice = await getTrustedDeviceModel();
  const now = new Date();
  const device = await TrustedDevice.findOneAndUpdate(
    { userId, tokenHash: hashToken(deviceToken), expiresAt: { $gt: now } },
    {
      $set: {
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + DEVICE_TRUST_SECONDS * 1000),
      },
    },
    { projection: { _id: 1 } },
  );
  return device !== null;
}

/** Trusts this browser for the user and sets its `ua_device` cookie. */
export async function trustDevice(
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<void> {
  // Always a fresh token: one browser shared by two accounts keeps only the
  // latest one's trust rather than moving a record between users
  const token = generateToken();
  const TrustedDevice = await getTrustedDeviceModel();
  await TrustedDevice.create({
    userId,
    tokenHash: hashToken(token),
    deviceName: getDeviceName(userAgentOf(request)),
    ipAddress: getClientIp(request),
    expiresAt: new Date(Date.now() + DEVICE_TRUST_SECONDS * 1000),
  });
  response.cookies.set(DEVICE_COOKIE, token, cookieOptions(DEVICE_TRUST_SECONDS));
}

/** Re-sets a still-trusted device's cookie so it slides with the database. */
export function refreshDeviceCookie(response: NextResponse, deviceToken: string): void {
  response.cookies.set(DEVICE_COOKIE, deviceToken, cookieOptions(DEVICE_TRUST_SECONDS));
}

// ---------------------------------------------------------------------------
// New-device challenges
// ---------------------------------------------------------------------------

interface DeviceChallenge {
  userId: string;
  otpHash: string;
  maskedEmail: string;
  deviceName: string;
  returnTo: string; // "" when the client knows where to go (password sign-in)
  resendCount: number;
}

const challengeKey = (rawToken: string) => `device_challenge:${hashToken(rawToken)}`;
const attemptsKey = (rawToken: string) => `${challengeKey(rawToken)}:attempts`;

export function readChallengeToken(value: string | undefined): string | null {
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export function clearChallengeCookie(response: NextResponse): void {
  response.cookies.set(DEVICE_CHALLENGE_COOKIE, "", cookieOptions(0));
}

export interface ChallengeUser {
  _id: unknown;
  email: string; // ciphertext
  fullName: string;
}

/**
 * Emails a sign-in code. Returns the raw challenge token (put it in the
 * cookie with setChallengeCookie) and the masked address, or null if the
 * email couldn't be sent.
 */
export async function startDeviceChallenge(
  request: NextRequest,
  user: ChallengeUser,
  returnTo: string,
): Promise<{ rawToken: string; maskedEmail: string } | null> {
  const email = decryptSensitiveData(user.email);
  const otp = generateOtp();
  const rawToken = generateToken();
  const challenge: DeviceChallenge = {
    userId: String(user._id),
    otpHash: hashOtp(otp),
    maskedEmail: maskEmailAddress(email),
    deviceName: getDeviceName(userAgentOf(request)),
    returnTo,
    resendCount: 0,
  };
  await redis.set(challengeKey(rawToken), challenge, { ex: DEVICE_CHALLENGE_TTL_SECONDS });

  const sent = await sendDeviceVerificationEmail({
    toEmail: email,
    toName: user.fullName,
    otp,
    deviceName: challenge.deviceName,
  });
  if (!sent) {
    await redis.del(challengeKey(rawToken));
    return null;
  }
  return { rawToken, maskedEmail: challenge.maskedEmail };
}

export function setChallengeCookie(response: NextResponse, rawToken: string): void {
  response.cookies.set(
    DEVICE_CHALLENGE_COOKIE,
    rawToken,
    cookieOptions(DEVICE_CHALLENGE_TTL_SECONDS),
  );
}

/** The pending challenge for a raw token, or null if it expired. */
export async function getDeviceChallenge(rawToken: string | null): Promise<DeviceChallenge | null> {
  if (!rawToken) return null;
  return redis.get<DeviceChallenge>(challengeKey(rawToken));
}

export type ChallengeResult =
  | { ok: true; challenge: DeviceChallenge }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

/**
 * Checks a code. Each wrong guess counts; after MAX_CODE_ATTEMPTS the
 * challenge is deleted and the user has to sign in again. A correct code
 * deletes the challenge, so it works once.
 */
export async function verifyDeviceChallenge(
  rawToken: string | null,
  otp: string,
): Promise<ChallengeResult> {
  const challenge = await getDeviceChallenge(rawToken);
  if (!rawToken || !challenge) return { ok: false, reason: "expired" };

  if (!safeEqualHex(challenge.otpHash, hashOtp(otp))) {
    const attempts = await redis.incr(attemptsKey(rawToken));
    if (attempts === 1) await redis.expire(attemptsKey(rawToken), DEVICE_CHALLENGE_TTL_SECONDS);
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await redis.del(challengeKey(rawToken), attemptsKey(rawToken));
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "invalid" };
  }

  // Single use: only the request that actually deletes it may continue
  const deleted = await redis.del(challengeKey(rawToken));
  await redis.del(attemptsKey(rawToken));
  if (deleted !== 1) return { ok: false, reason: "expired" };
  return { ok: true, challenge };
}

/**
 * Emails a new code for the same challenge. Wrong-guess counts carry over,
 * so resending doesn't buy extra attempts.
 */
export async function resendDeviceChallenge(
  rawToken: string | null,
  user: ChallengeUser,
): Promise<"sent" | "expired" | "limit" | "failed"> {
  const challenge = await getDeviceChallenge(rawToken);
  if (!rawToken || !challenge) return "expired";
  if (challenge.resendCount >= MAX_CHALLENGE_RESENDS) return "limit";

  const otp = generateOtp();
  await redis.set(
    challengeKey(rawToken),
    { ...challenge, otpHash: hashOtp(otp), resendCount: challenge.resendCount + 1 },
    { keepTtl: true },
  );
  const sent = await sendDeviceVerificationEmail({
    toEmail: decryptSensitiveData(user.email),
    toName: user.fullName,
    otp,
    deviceName: challenge.deviceName,
  });
  return sent ? "sent" : "failed";
}

/** A 6-digit code, as typed into the OTP input. */
export function isSixDigitCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}
