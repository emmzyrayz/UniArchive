// POST /api/auth/login
// Verifies credentials and starts a session. The raw session token goes only
// into an httpOnly cookie; the database stores its hash. No JWT is issued and
// other sessions are left alone (multiple devices are allowed).
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getUserModel } from "@/lib/models/userModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { hashForSearch } from "@/lib/encryption";
import {
  getClientIp,
  getDeviceInfo,
  handleRouteError,
  readJson,
} from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { generateToken, normaliseEmail } from "@/lib/auth/tokens";
import {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  SESSION_JWT_COOKIE,
  sessionJwtCookieOptions,
  signSessionJwt,
} from "@/lib/auth/jwt";

// Compared against when the email is unknown, so both paths cost one bcrypt.
const DUMMY_HASH = bcrypt.hashSync("uniarchive-timing-equaliser", 12);

const invalidCredentials = () =>
  NextResponse.json(
    { message: "Incorrect email or password." },
    { status: 401 },
  );

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "login", 10);

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

    if (!user.isVerified) {
      return NextResponse.json(
        {
          message: "Please verify your email before signing in.",
          requiresVerification: true,
        },
        { status: 403 },
      );
    }

    const rawToken = generateToken();
    const SessionCache = await getSessionCacheModel();
    await SessionCache.createFullSession(
      String(user._id),
      {
        email,
        fullName: user.fullName,
        role: user.role,
        school: user.school,
        faculty: user.faculty,
        department: user.department,
        level: user.level,
        upid: user.upid,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
      },
      rawToken,
      SESSION_TTL_HOURS,
      getDeviceInfo(request),
      getClientIp(request),
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        upid: user.upid,
        role: user.role,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
    response.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions());
    // Short-lived access token for src/proxy.ts (renewed via /api/auth/refresh)
    response.cookies.set(
      SESSION_JWT_COOKIE,
      await signSessionJwt({ sub: String(user._id), role: user.role, upid: user.upid }),
      sessionJwtCookieOptions(),
    );
    return response;
  } catch (error) {
    return handleRouteError(error, "login");
  }
}
