// POST /api/auth/resend-verification
// Always returns the same response, so it can't be used to find out which
// emails are registered.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { EMAIL_REGEX, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  normaliseEmail,
  withMinimumDuration,
} from "@/lib/auth/tokens";
import { emailService } from "@/utils/email";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If that email belongs to an unverified account, a new code is on its way.",
};

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "resend-verification", 3);

    const body = await readJson<{ email: string }>(request);
    const email =
      typeof body?.email === "string" ? normaliseEmail(body.email) : "";
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    await withMinimumDuration(
      (async () => {
        const User = await getUserModel();
        const user = await User.findOne({ emailHash: hashForSearch(email) })
          .select("isVerified firstName fullName")
          .lean();
        if (!user || user.isVerified) return;

        const otp = generateOtp();
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              verificationCodeHash: hashOtp(otp),
              verificationCodeExpires: new Date(Date.now() + OTP_TTL_MS),
              verificationAttempts: 0,
            },
          },
        );
        await emailService.sendVerificationEmail(
          email,
          user.firstName || user.fullName,
          otp,
        );
      })(),
    );

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    return handleRouteError(error, "resend-verification");
  }
}
