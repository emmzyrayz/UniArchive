// POST /api/auth/verify-device/resend
// Emails a new sign-in code for the challenge in the `ua_device_challenge`
// cookie. Wrong-guess counts carry over; a challenge allows a few resends.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import {
  DEVICE_CHALLENGE_COOKIE,
  getDeviceChallenge,
  readChallengeToken,
  resendDeviceChallenge,
} from "@/lib/auth/deviceRecognition";

const expired = () =>
  NextResponse.json(
    { message: "This code has expired. Please sign in again.", expired: true },
    { status: 410 },
  );

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `device-resend:${getClientIp(request)}`);

    const rawToken = readChallengeToken(request.cookies.get(DEVICE_CHALLENGE_COOKIE)?.value);
    const challenge = await getDeviceChallenge(rawToken);
    if (!challenge) return expired();

    const User = await getUserModel();
    const user = await User.findById(challenge.userId).select("email fullName");
    if (!user) return expired();

    const result = await resendDeviceChallenge(rawToken, user);
    if (result === "expired") return expired();
    if (result === "limit") {
      return NextResponse.json(
        { message: "You've requested too many codes. Please sign in again." },
        { status: 429 },
      );
    }
    if (result === "failed") {
      return NextResponse.json(
        { message: "We couldn't send the email. Please try again shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "verify-device-resend");
  }
}
