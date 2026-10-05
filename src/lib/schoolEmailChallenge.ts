// src/lib/schoolEmailChallenge.ts
// The emailed-code step for a school email, shared by signup
// (/api/auth/school-email/*, before the account exists) and Settings
// (/api/user/school-email/*, signed in). See models/schoolEmailChallengeModel.ts.
import { getSchoolEmailChallengeModel, SCHOOL_EMAIL_MAX_ATTEMPTS, SCHOOL_EMAIL_OTP_TTL_MS, SCHOOL_EMAIL_PROOF_TTL_MS, type ISchoolEmailChallenge } from "@/lib/models/schoolEmailChallengeModel";
import { getUserModel } from "@/lib/models/userModel";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { generateOtp, generateToken, hashOtp, hashToken, safeEqualHex } from "@/lib/auth/tokens";
import { sendSchoolEmailCode } from "@/utils/email";

export class SchoolEmailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Emails a code to `email` (already checked against `school`) and returns
 * the challenge token the browser sends back with it. `forUserId`: the
 * signed-in user (Settings); the challenge is bound to them, and their own
 * current school email doesn't count as taken.
 */
export async function startSchoolEmailChallenge(email: string, school: string, forUserId?: string): Promise<string> {
  const emailHash = hashForSearch(email);
  const User = await getUserModel();
  if (await User.exists({ schoolEmailHash: emailHash, ...(forUserId && { _id: { $ne: forUserId } }) })) {
    throw new SchoolEmailError("This school email is already linked to a UniArchive account.", 409);
  }

  const otp = generateOtp();
  const token = generateToken();
  const now = Date.now();
  const Challenge = await getSchoolEmailChallengeModel();
  await Challenge.create({
    tokenHash: hashToken(token),
    email: encryptSensitiveData(email),
    emailHash,
    school,
    ...(forUserId && { userId: forUserId }),
    otpHash: hashOtp(otp),
    otpExpiresAt: new Date(now + SCHOOL_EMAIL_OTP_TTL_MS),
    expiresAt: new Date(now + SCHOOL_EMAIL_OTP_TTL_MS),
  });

  const sent = await sendSchoolEmailCode({ toEmail: email, school, otp });
  if (!sent && process.env.NODE_ENV === "production") {
    throw new SchoolEmailError("We couldn't send the code. Please try again.", 502);
  }
  return token;
}

/**
 * Checks the code for a challenge (5 attempts) and marks it verified, kept
 * for SCHOOL_EMAIL_PROOF_TTL_MS. Returns the verified challenge.
 */
export async function verifySchoolEmailChallenge(
  token: string,
  code: string,
  /** The signed-in user (Settings), or null for signup */
  userId: string | null,
): Promise<ISchoolEmailChallenge> {
  const invalid = new SchoolEmailError("Invalid or expired code. Please try again.", 400);
  if (!/^[a-f0-9]{64}$/.test(token) || !/^\d{6}$/.test(code)) throw invalid;

  const Challenge = await getSchoolEmailChallengeModel();
  // A Settings challenge only for its own user; signup only its own kind
  const challenge = await Challenge.findOne({
    tokenHash: hashToken(token),
    used: false,
    userId: userId ?? { $exists: false },
  }).lean<ISchoolEmailChallenge>();
  if (!challenge) throw invalid;
  if (challenge.verifiedAt) return challenge;
  if (challenge.attempts >= SCHOOL_EMAIL_MAX_ATTEMPTS) {
    throw new SchoolEmailError("Too many attempts. Request a new code.", 429);
  }
  const expired = new Date(challenge.otpExpiresAt).getTime() < Date.now();
  if (expired || !safeEqualHex(challenge.otpHash, hashOtp(code))) {
    await Challenge.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
    throw invalid;
  }

  const now = Date.now();
  const verifiedAt = new Date(now);
  await Challenge.updateOne(
    { _id: challenge._id },
    { $set: { verifiedAt, expiresAt: new Date(now + SCHOOL_EMAIL_PROOF_TTL_MS) } },
  );
  return { ...challenge, verifiedAt };
}
