// POST /api/auth/verify-device   { otp, trustDevice? }
// Completes a sign-in from an unrecognised device with the emailed code. The
// pending challenge is found by the httpOnly `ua_device_challenge` cookie set
// by /api/auth/login or /api/auth/social-callback (lib/auth/deviceRecognition).
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { startSession } from "@/lib/auth/startSession";
import {
  DEVICE_CHALLENGE_COOKIE,
  clearChallengeCookie,
  isSixDigitCode,
  readChallengeToken,
  trustDevice,
  verifyDeviceChallenge,
} from "@/lib/auth/deviceRecognition";

function endChallenge(status: number, message: string) {
  const response = NextResponse.json({ message, expired: true }, { status });
  clearChallengeCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `verify-device:${getClientIp(request)}`);

    const body = await readJson<{ otp: string; trustDevice?: boolean }>(request);
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    if (!isSixDigitCode(otp)) {
      return NextResponse.json({ message: "Enter the 6-digit code from your email." }, { status: 400 });
    }

    const rawToken = readChallengeToken(request.cookies.get(DEVICE_CHALLENGE_COOKIE)?.value);
    const result = await verifyDeviceChallenge(rawToken, otp);
    if (!result.ok) {
      if (result.reason === "invalid") {
        return NextResponse.json({ message: "Incorrect code. Please try again." }, { status: 400 });
      }
      if (result.reason === "locked") {
        return endChallenge(429, "Too many attempts. Please sign in again.");
      }
      return endChallenge(410, "This code has expired. Please sign in again.");
    }

    const User = await getUserModel();
    const user = await User.findById(result.challenge.userId);
    if (!user || user.isSuspended || !user.isVerified) {
      return endChallenge(403, "This account can't sign in right now.");
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: result.challenge.returnTo || undefined,
    });
    await startSession(request, response, user);
    if (body?.trustDevice === true) await trustDevice(request, response, String(user._id));
    clearChallengeCookie(response);
    return response;
  } catch (error) {
    return handleRouteError(error, "verify-device");
  }
}
