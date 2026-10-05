// POST /api/auth/register
// Creates an unverified student account and emails a 6-digit code.
// Only the fields the signup wizard collects are required; dob, phone,
// gender, level, faculty, department and regNumber come later in profile
// completion. The role is always "student" - it is never read from the body.
// schoolEmailToken (optional) is a challenge verified through
// /api/auth/school-email/*: its school email is stored on the account and
// earns the verified_student badge once the main email is verified.
import { NextResponse, type NextRequest } from "next/server";
import type { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { asTrimmedString, EMAIL_REGEX, getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { isPasswordValid } from "@/lib/validation/password";
import {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  hashToken,
  normaliseEmail,
} from "@/lib/auth/tokens";
import { emailService } from "@/utils/email";
import { getSchoolEmailChallengeModel } from "@/lib/models/schoolEmailChallengeModel";
import universitiesData from "@/assets/data/schoolData";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const KNOWN_SCHOOLS = new Set(universitiesData.universities.map((u) => u.name));

const conflict = () =>
  NextResponse.json(
    { message: "Registration failed. Please try again." },
    { status: 409 },
  );

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  school: string;
  schoolEmailToken: string;
}

const schoolEmailExpired = () =>
  NextResponse.json(
    {
      message: "Your school email check expired. Verify it again, or skip that step.",
      errors: { schoolEmail: "Verify your school email again, or skip this step." },
    },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `register:${getClientIp(request)}`);

    const body = await readJson<RegisterBody>(request);
    const email = normaliseEmail(asTrimmedString(body?.email, 254));
    const password = typeof body?.password === "string" ? body.password : "";
    const firstName = asTrimmedString(body?.firstName, 60);
    const lastName = asTrimmedString(body?.lastName, 60);
    const username = asTrimmedString(body?.username, 20);
    const school = asTrimmedString(body?.school, 200);
    const schoolEmailToken =
      typeof body?.schoolEmailToken === "string" ? body.schoolEmailToken : "";

    const errors: Record<string, string> = {};
    if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";
    if (!isPasswordValid(password))
      errors.password = "Password does not meet the requirements.";
    if (!firstName) errors.firstName = "First name is required.";
    if (!lastName) errors.lastName = "Last name is required.";
    if (!USERNAME_REGEX.test(username))
      errors.username = "3-20 characters, letters/numbers/underscore only.";
    if (!KNOWN_SCHOOLS.has(school)) errors.school = "Select your institution.";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { message: "Please fix the highlighted fields.", errors },
        { status: 400 },
      );
    }

    const User = await getUserModel();
    const emailHash = hashForSearch(email);
    const existing = await User.exists({
      $or: [{ emailHash }, { username: username.toLowerCase() }],
    });
    if (existing) return conflict();

    // Claim the verified school email, if any, so it can't be used twice
    const Challenge = await getSchoolEmailChallengeModel();
    let schoolEmail: { email: string; emailHash: string; verifiedAt: Date; id: Types.ObjectId } | null = null;
    if (schoolEmailToken) {
      if (!/^[a-f0-9]{64}$/.test(schoolEmailToken)) return schoolEmailExpired();
      const challenge = await Challenge.findOneAndUpdate(
        {
          tokenHash: hashToken(schoolEmailToken),
          school,
          used: false,
          // Settings challenges belong to an existing account
          userId: { $exists: false },
          verifiedAt: { $exists: true },
          expiresAt: { $gt: new Date() },
        },
        { $set: { used: true } },
        { returnDocument: "after" },
      ).lean();
      if (!challenge?.verifiedAt) return schoolEmailExpired();
      schoolEmail = {
        email: challenge.email,
        emailHash: challenge.emailHash,
        verifiedAt: challenge.verifiedAt,
        id: challenge._id,
      };
      if (await User.exists({ schoolEmailHash: challenge.emailHash })) {
        return NextResponse.json(
          {
            message: "This school email is already linked to a UniArchive account.",
            errors: { schoolEmail: "This school email is already linked to another account." },
          },
          { status: 409 },
        );
      }
    }
    // Give a claimed school email back if the account isn't created
    const releaseSchoolEmail = async () => {
      if (schoolEmail) await Challenge.updateOne({ _id: schoolEmail.id }, { $set: { used: false } });
    };

    const fullName = `${firstName} ${lastName}`;
    const otp = generateOtp();

    // upid has a small random suffix; retry on the rare collision.
    let upid = User.generateUPID(fullName, school);
    for (let i = 0; i < 3 && (await User.exists({ upid })); i++) {
      upid = User.generateUPID(fullName, school);
    }

    const user = new User({
      fullName,
      firstName,
      lastName,
      username,
      email: encryptSensitiveData(email),
      emailHash,
      password, // hashed by the pre-save hook (bcrypt, 12 rounds)
      school,
      role: "student",
      uuid: User.generateUUID(),
      upid,
      isVerified: false,
      verificationCodeHash: hashOtp(otp),
      verificationCodeExpires: new Date(Date.now() + OTP_TTL_MS),
      verificationAttempts: 0,
      ...(schoolEmail && {
        schoolEmail: schoolEmail.email,
        schoolEmailHash: schoolEmail.emailHash,
        schoolEmailVerifiedAt: schoolEmail.verifiedAt,
      }),
    });

    try {
      await user.save();
    } catch (error) {
      await releaseSchoolEmail();
      // Lost a race with a concurrent registration for the same email/username.
      if ((error as { code?: number }).code === 11000) return conflict();
      throw error;
    }

    const sent = await emailService.sendVerificationEmail(email, firstName, otp);
    if (!sent) console.error("register: verification email was not sent");

    return NextResponse.json(
      {
        success: true,
        message: "Account created. Check your email for a verification code.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "register");
  }
}
