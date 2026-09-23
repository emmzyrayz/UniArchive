// POST /api/auth/verify-reset-code
// Exchanges either a typed code ({ email, code }) or a magic-link token
// ({ token }) for a short-lived reset token that only /api/auth/reset-password
// accepts. The code and link are consumed on success.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { decryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  MAX_CODE_ATTEMPTS,
  RESET_SESSION_TTL_MS,
  generateToken,
  hashOtp,
  hashToken,
  normaliseEmail,
  safeEqualHex,
} from "@/lib/auth/tokens";

const invalid = () =>
  NextResponse.json(
    { message: "This code or link is invalid or has expired." },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "verify-reset-code", 10);

    const body = await readJson<{ email: string; code: string; token: string }>(
      request,
    );
    const User = await getUserModel();
    let user;
    let email: string;

    if (typeof body?.token === "string" && /^[a-f0-9]{64}$/.test(body.token)) {
      // Path B: magic link
      user = await User.findOne({
        resetTokenHash: hashToken(body.token),
        resetTokenExpires: { $gt: new Date() },
      });
      if (!user) return invalid();
      email = decryptSensitiveData(user.email);
    } else {
      // Path A: typed code
      email =
        typeof body?.email === "string" ? normaliseEmail(body.email) : "";
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      if (!email || !/^\d{6}$/.test(code)) return invalid();

      user = await User.findOne({ emailHash: hashForSearch(email) });
      if (!user || !user.resetCodeHash) return invalid();

      if (user.resetCodeAttempts >= MAX_CODE_ATTEMPTS) {
        return NextResponse.json(
          { message: "Too many attempts. Request a new code." },
          { status: 429 },
        );
      }

      const expired =
        !user.resetCodeExpires || user.resetCodeExpires.getTime() < Date.now();
      if (expired || !safeEqualHex(user.resetCodeHash, hashOtp(code))) {
        await User.updateOne(
          { _id: user._id },
          { $inc: { resetCodeAttempts: 1 } },
        );
        return invalid();
      }
    }

    const resetToken = generateToken();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetSessionHash: hashToken(resetToken),
          resetSessionExpires: new Date(Date.now() + RESET_SESSION_TTL_MS),
          resetCodeAttempts: 0,
        },
        $unset: {
          resetTokenHash: 1,
          resetTokenExpires: 1,
          resetCodeHash: 1,
          resetCodeExpires: 1,
        },
      },
    );

    return NextResponse.json({
      success: true,
      resetToken,
      email,
      expiresIn: RESET_SESSION_TTL_MS / 1000,
    });
  } catch (error) {
    return handleRouteError(error, "verify-reset-code");
  }
}
