// POST /api/auth/request-reset
// Emails a 6-digit reset code AND a single-use magic link (the verify page
// accepts either). Responds identically whether or not the account exists.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { EMAIL_REGEX, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  OTP_TTL_MS,
  RESET_LINK_TTL_MS,
  generateOtp,
  generateToken,
  hashOtp,
  hashToken,
  normaliseEmail,
  withMinimumDuration,
} from "@/lib/auth/tokens";
import { emailService } from "@/utils/email";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an account with this email exists, a reset code and link have been sent.",
};

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "request-reset", 5);

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
          .select("firstName fullName")
          .lean();
        if (!user) return;

        const rawToken = generateToken();
        const code = generateOtp();
        const now = Date.now();

        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              resetTokenHash: hashToken(rawToken),
              resetTokenExpires: new Date(now + RESET_LINK_TTL_MS),
              resetCodeHash: hashOtp(code),
              resetCodeExpires: new Date(now + OTP_TTL_MS),
              resetCodeAttempts: 0,
            },
            $unset: { resetSessionHash: 1, resetSessionExpires: 1 },
          },
        );

        const sent = await emailService.sendPasswordResetEmail(
          email,
          user.firstName || user.fullName,
          rawToken,
          code,
        );
        if (!sent) console.error("request-reset: reset email was not sent");
      })(),
      500,
    );

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    return handleRouteError(error, "request-reset");
  }
}
