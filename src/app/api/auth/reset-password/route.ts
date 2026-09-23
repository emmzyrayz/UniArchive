// POST /api/auth/reset-password
// Sets a new password using the short-lived token from verify-reset-code,
// then signs the user out everywhere.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { isPasswordValid } from "@/lib/validation/password";
import { hashToken } from "@/lib/auth/tokens";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { SESSION_JWT_COOKIE, sessionJwtCookieOptions } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "reset-password", 10);

    const body = await readJson<{
      resetToken: string;
      password: string;
      newPassword: string;
    }>(request);
    const resetToken =
      typeof body?.resetToken === "string" ? body.resetToken : "";
    const password =
      typeof body?.password === "string"
        ? body.password
        : typeof body?.newPassword === "string"
          ? body.newPassword
          : "";

    if (!/^[a-f0-9]{64}$/.test(resetToken)) {
      return NextResponse.json(
        { message: "Your reset session has expired. Start again." },
        { status: 400 },
      );
    }
    if (!isPasswordValid(password)) {
      return NextResponse.json(
        { message: "Password does not meet the requirements." },
        { status: 400 },
      );
    }

    const User = await getUserModel();
    const user = await User.findOne({
      resetSessionHash: hashToken(resetToken),
      resetSessionExpires: { $gt: new Date() },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Your reset session has expired. Start again." },
        { status: 400 },
      );
    }

    user.password = password; // hashed by the pre-save hook
    user.resetSessionHash = undefined;
    user.resetSessionExpires = undefined;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    user.resetCodeAttempts = 0;
    await user.save();

    const SessionCache = await getSessionCacheModel();
    await SessionCache.invalidateAllUserSessions(String(user._id));

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
    return response;
  } catch (error) {
    return handleRouteError(error, "reset-password");
  }
}
