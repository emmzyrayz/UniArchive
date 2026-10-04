// POST /api/auth/school-email/send
// Signup's optional "School email" step: checks that the address belongs to
// the picked school (lib/schoolEmail.ts), emails it a 6-digit code and
// returns a challenge token the browser sends back with the code. The
// account doesn't exist yet, so the challenge lives in its own collection
// (models/schoolEmailChallengeModel.ts).
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import {
  SCHOOL_EMAIL_OTP_TTL_MS,
  getSchoolEmailChallengeModel,
} from "@/lib/models/schoolEmailChallengeModel";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { asTrimmedString, getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { generateOtp, generateToken, hashOtp, hashToken } from "@/lib/auth/tokens";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";
import { sendSchoolEmailCode } from "@/utils/email";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `school-email:${getClientIp(request)}`);

    const body = await readJson<{ schoolEmail: string; school: string }>(request);
    const school = asTrimmedString(body?.school, 200);
    const check = checkSchoolEmail(asTrimmedString(body?.schoolEmail, 254), school);
    if (!check.ok) {
      return NextResponse.json(
        { message: schoolEmailError(check, school), errors: { schoolEmail: schoolEmailError(check, school) } },
        { status: 400 },
      );
    }

    const emailHash = hashForSearch(check.email);
    await enforceRateLimit(request, "schoolEmail", emailHash);

    const User = await getUserModel();
    if (await User.exists({ schoolEmailHash: emailHash })) {
      return NextResponse.json(
        { message: "This school email is already linked to a UniArchive account." },
        { status: 409 },
      );
    }

    const otp = generateOtp();
    const token = generateToken();
    const now = Date.now();
    const Challenge = await getSchoolEmailChallengeModel();
    await Challenge.create({
      tokenHash: hashToken(token),
      email: encryptSensitiveData(check.email),
      emailHash,
      school,
      otpHash: hashOtp(otp),
      otpExpiresAt: new Date(now + SCHOOL_EMAIL_OTP_TTL_MS),
      expiresAt: new Date(now + SCHOOL_EMAIL_OTP_TTL_MS),
    });

    const sent = await sendSchoolEmailCode({ toEmail: check.email, school, otp });
    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "We couldn't send the code. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, challengeToken: token });
  } catch (error) {
    return handleRouteError(error, "school-email/send");
  }
}
