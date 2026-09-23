// POST /api/auth/verify-email
// Checks the 6-digit code against its stored hash. Five wrong attempts lock
// the code until a new one is requested. Does not sign the user in.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  MAX_CODE_ATTEMPTS,
  hashOtp,
  normaliseEmail,
  safeEqualHex,
} from "@/lib/auth/tokens";

const invalid = () =>
  NextResponse.json(
    { message: "Invalid or expired code. Please try again." },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "verify-email", 10);

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

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "verify-email");
  }
}
