// POST /api/auth/link-account/resend
// Emails a new code for the pending Google link in the `ua_link` cookie.
// Wrong-guess counts carry over, and at most LINK_MAX_RESENDS codes are sent.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import {
  LINK_MAX_ATTEMPTS,
  LINK_MAX_RESENDS,
  LINK_OTP_TTL_MS,
  getPendingLinkModel,
} from "@/lib/models/pendingLinkModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { generateOtp, hashOtp, hashToken } from "@/lib/auth/tokens";
import { LINK_COOKIE, readLinkToken } from "@/lib/auth/linkCookie";
import { sendLinkConfirmationEmail } from "@/utils/email";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `link-resend:${getClientIp(request)}`);

    const linkToken = readLinkToken(request.cookies.get(LINK_COOKIE)?.value);
    const PendingLink = await getPendingLinkModel();
    const pending = linkToken
      ? await PendingLink.findOne({ linkTokenHash: hashToken(linkToken), used: false })
      : null;
    if (!pending || pending.attempts >= LINK_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: "This link request has expired. Sign in with Google again to start over.", expired: true },
        { status: 410 },
      );
    }
    if (pending.resendCount >= LINK_MAX_RESENDS) {
      return NextResponse.json(
        { message: "You've requested too many codes. Sign in with Google again to start over." },
        { status: 429 },
      );
    }

    const User = await getUserModel();
    const user = await User.findById(pending.userId).select("email fullName");
    if (!user) {
      return NextResponse.json({ message: "This link request has expired.", expired: true }, { status: 410 });
    }

    const otp = generateOtp();
    await PendingLink.updateOne(
      { _id: pending._id },
      {
        $set: { otpHash: hashOtp(otp), otpExpiresAt: new Date(Date.now() + LINK_OTP_TTL_MS) },
        $inc: { resendCount: 1 },
      },
    );
    const sent = await sendLinkConfirmationEmail({
      toEmail: decryptSensitiveData(user.email),
      toName: user.fullName,
      otp,
      googleEmail: pending.googleEmail,
    });
    if (!sent) {
      return NextResponse.json(
        { message: "We couldn't send the email. Please try again shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "link-account-resend");
  }
}
