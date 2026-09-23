// POST /api/auth/register
// Creates an unverified student account and emails a 6-digit code.
// Only the fields the signup wizard collects are required; dob, phone,
// gender, level, faculty, department and regNumber come later in profile
// completion. The role is always "student" - it is never read from the body.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import {
  EMAIL_REGEX,
  asTrimmedString,
  handleRouteError,
  readJson,
} from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { isPasswordValid } from "@/lib/validation/password";
import {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  normaliseEmail,
} from "@/lib/auth/tokens";
import { emailService } from "@/utils/email";
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
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "register", 5);

    const body = await readJson<RegisterBody>(request);
    const email = normaliseEmail(asTrimmedString(body?.email, 254));
    const password = typeof body?.password === "string" ? body.password : "";
    const firstName = asTrimmedString(body?.firstName, 60);
    const lastName = asTrimmedString(body?.lastName, 60);
    const username = asTrimmedString(body?.username, 20);
    const school = asTrimmedString(body?.school, 200);

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
    });

    try {
      await user.save();
    } catch (error) {
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
