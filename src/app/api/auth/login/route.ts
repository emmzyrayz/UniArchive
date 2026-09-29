// POST /api/auth/login
// Verifies credentials and starts a session (lib/auth/startSession.ts). Other
// sessions are left alone (multiple devices are allowed). From a device that
// isn't trusted yet (no valid `ua_device` cookie), it instead emails a code
// and answers 202 { requiresDeviceVerification }; the sign-in finishes at
// /api/auth/verify-device.
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { normaliseEmail } from "@/lib/auth/tokens";
import { startSession } from "@/lib/auth/startSession";
import {
  isDeviceTrusted,
  readDeviceToken,
  refreshDeviceCookie,
  setChallengeCookie,
  startDeviceChallenge,
} from "@/lib/auth/deviceRecognition";

// Compared against when the email is unknown, so both paths cost one bcrypt.
const DUMMY_HASH = bcrypt.hashSync("uniarchive-timing-equaliser", 12);

const invalidCredentials = () =>
  NextResponse.json(
    { message: "Incorrect email or password." },
    { status: 401 },
  );

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `login:${getClientIp(request)}`);

    const body = await readJson<{ email: string; password: string }>(request);
    const email =
      typeof body?.email === "string" ? normaliseEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || password.length > 128) {
      return invalidCredentials();
    }

    const User = await getUserModel();
    const user = await User.findOne({ emailHash: hashForSearch(email) });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return invalidCredentials();
    }
    if (!(await user.comparePassword(password))) return invalidCredentials();

    if (user.isSuspended) {
      return NextResponse.json(
        { message: "This account has been suspended. Contact support if you think this is a mistake." },
        { status: 403 },
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          message: "Please verify your email before signing in.",
          requiresVerification: true,
        },
        { status: 403 },
      );
    }

    const userId = String(user._id);
    const deviceToken = readDeviceToken(request);
    if (!(await isDeviceTrusted(userId, deviceToken))) {
      // Right password, unknown device: email a code before any session.
      // The challenge token goes only into an httpOnly cookie.
      // No destination: the sign-in form already knows where it was going
      const challenge = await startDeviceChallenge(request, user, "");
      if (!challenge) {
        return NextResponse.json(
          { message: "We couldn't send your sign-in code. Please try again shortly." },
          { status: 503 },
        );
      }
      const response = NextResponse.json(
        { requiresDeviceVerification: true, maskedEmail: challenge.maskedEmail },
        { status: 202 },
      );
      setChallengeCookie(response, challenge.rawToken);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        upid: user.upid,
        role: user.role,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
    await startSession(request, response, user);
    if (deviceToken) refreshDeviceCookie(response, deviceToken);
    return response;
  } catch (error) {
    return handleRouteError(error, "login");
  }
}
