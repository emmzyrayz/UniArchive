// POST /api/auth/school-email/verify
// Checks the code sent by /api/auth/school-email/send. On success the
// challenge is marked verified and kept for SCHOOL_EMAIL_PROOF_TTL_MS, so
// /api/auth/register can store the school email on the new account.
import { NextResponse, type NextRequest } from "next/server";
import {
  SCHOOL_EMAIL_MAX_ATTEMPTS,
  SCHOOL_EMAIL_PROOF_TTL_MS,
  getSchoolEmailChallengeModel,
} from "@/lib/models/schoolEmailChallengeModel";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { hashOtp, hashToken, safeEqualHex } from "@/lib/auth/tokens";

const invalid = () =>
  NextResponse.json(
    { message: "Invalid or expired code. Please try again." },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `school-email-verify:${getClientIp(request)}`);

    const body = await readJson<{ challengeToken: string; code: string }>(request);
    const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token) || !/^\d{6}$/.test(code)) return invalid();

    const Challenge = await getSchoolEmailChallengeModel();
    const challenge = await Challenge.findOne({ tokenHash: hashToken(token), used: false });
    if (!challenge) return invalid();
    if (challenge.verifiedAt) return NextResponse.json({ success: true });

    if (challenge.attempts >= SCHOOL_EMAIL_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: "Too many attempts. Request a new code." },
        { status: 429 },
      );
    }

    const expired = challenge.otpExpiresAt.getTime() < Date.now();
    if (expired || !safeEqualHex(challenge.otpHash, hashOtp(code))) {
      await Challenge.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
      return invalid();
    }

    const now = Date.now();
    await Challenge.updateOne(
      { _id: challenge._id },
      { $set: { verifiedAt: new Date(now), expiresAt: new Date(now + SCHOOL_EMAIL_PROOF_TTL_MS) } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "school-email/verify");
  }
}
