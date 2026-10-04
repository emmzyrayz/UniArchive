// POST /api/auth/verify-email
// Checks the 6-digit code against its stored hash. Five wrong attempts lock
// the code until a new one is requested. Does not sign the user in, but
// trusts this browser as the account's first device.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import {
  MAX_CODE_ATTEMPTS,
  hashOtp,
  normaliseEmail,
  safeEqualHex,
} from "@/lib/auth/tokens";
import { trustDevice } from "@/lib/auth/deviceRecognition";
import { awardBadgesAfter } from "@/lib/badges";

const invalid = () =>
  NextResponse.json(
    { message: "Invalid or expired code. Please try again." },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `verify-email:${getClientIp(request)}`);

    const body = await readJson<{ email: string; code: string }>(request);
    const email =
      typeof body?.email === "string" ? normaliseEmail(body.email) : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return invalid();

    const User = await getUserModel();
    const user = await User.findOne({ emailHash: hashForSearch(email) });
    if (!user || user.isVerified || !user.verificationCodeHash) return invalid();

    if (user.verificationAttempts >= MAX_CODE_ATTEMPTS) {
      return NextResponse.json(
        { message: "Too many attempts. Request a new code." },
        { status: 429 },
      );
    }

    const expired =
      !user.verificationCodeExpires ||
      user.verificationCodeExpires.getTime() < Date.now();

    if (expired || !safeEqualHex(user.verificationCodeHash, hashOtp(code))) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { verificationAttempts: 1 } },
      );
      return invalid();
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true, verificationAttempts: 0 },
        $unset: { verificationCodeHash: 1, verificationCodeExpires: 1 },
      },
    );

    // A school email proved at signup counts once the account is real
    if (user.schoolEmailVerifiedAt) awardBadgesAfter(user._id, "school_email_verified");

    // This browser just proved it can read the account's email, so it's the
    // user's first trusted device: signing in here won't ask for a code
    const response = NextResponse.json({ success: true });
    await trustDevice(request, response, String(user._id));
    return response;
  } catch (error) {
    return handleRouteError(error, "verify-email");
  }
}
