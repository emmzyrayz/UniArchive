// POST /api/auth/link-account   { otp, password?, trustDevice? }
// Confirms a pending Google link with the code emailed to the existing
// account, links it and signs in. The pending link is found by the httpOnly
// `ua_link` cookie set by /api/auth/social-callback, never by an id from the
// body. Replacing an already-linked Google account also needs the account's
// password. Three wrong codes or passwords cancel the link.
//
// DELETE /api/auth/link-account
// Cancels the pending link ("Use a different account").
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import {
  LINK_MAX_ATTEMPTS,
  getPendingLinkModel,
} from "@/lib/models/pendingLinkModel";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { hashOtp, hashToken, safeEqualHex } from "@/lib/auth/tokens";
import { LINK_COOKIE, linkCookieOptions, readLinkToken } from "@/lib/auth/linkCookie";
import { startSession } from "@/lib/auth/startSession";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { isSixDigitCode, trustDevice } from "@/lib/auth/deviceRecognition";

function reply(status: number, message: string, clearCookie = false, extra: object = {}) {
  const response = NextResponse.json({ message, ...extra }, { status });
  if (clearCookie) response.cookies.set(LINK_COOKIE, "", linkCookieOptions(0));
  return response;
}

const expired = () =>
  reply(410, "This link request has expired. Sign in with Google again to start over.", true, {
    expired: true,
  });

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `link-account:${getClientIp(request)}`);

    const body = await readJson<{ otp: string; password?: string; trustDevice?: boolean }>(
      request,
    );
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!isSixDigitCode(otp)) return reply(400, "Enter the 6-digit code from your email.");

    const linkToken = readLinkToken(request.cookies.get(LINK_COOKIE)?.value);
    if (!linkToken) return expired();

    const PendingLink = await getPendingLinkModel();
    const pending = await PendingLink.findOne({
      linkTokenHash: hashToken(linkToken),
      used: false,
    });
    if (!pending) return expired();

    if (pending.otpExpiresAt.getTime() < Date.now()) {
      return reply(400, "This code has expired. Request a new one.");
    }

    const User = await getUserModel();
    const user = await User.findById(pending.userId);
    if (!user) return expired();

    if (pending.requiresPassword && !password) {
      return reply(400, "Enter your UniArchive password.");
    }
    const passwordOk =
      !pending.requiresPassword ||
      (password.length <= 128 && (await user.comparePassword(password)));
    const otpOk = safeEqualHex(pending.otpHash, hashOtp(otp));

    if (!passwordOk || !otpOk) {
      const updated = await PendingLink.findOneAndUpdate(
        { _id: pending._id, used: false },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      const attempts = updated?.attempts ?? LINK_MAX_ATTEMPTS;
      if (attempts >= LINK_MAX_ATTEMPTS) {
        await PendingLink.deleteOne({ _id: pending._id });
        return reply(429, "Too many attempts. Please try again.", true, { expired: true });
      }
      const left = LINK_MAX_ATTEMPTS - attempts;
      const what = passwordOk ? "code" : "password";
      return reply(400, `Incorrect ${what}. ${left} attempt${left === 1 ? "" : "s"} left.`);
    }

    // Claim it: only one request may use a pending link
    const claimed = await PendingLink.findOneAndUpdate(
      { _id: pending._id, used: false, attempts: { $lt: LINK_MAX_ATTEMPTS } },
      { $set: { used: true } },
    );
    if (!claimed) return expired();

    if (user.isSuspended) {
      return reply(
        403,
        "This account has been suspended. Contact support if you think this is a mistake.",
        true,
      );
    }
    // Linked to another Google account since this request started
    if (!pending.relink && user.googleId && user.googleId !== pending.googleId) {
      return reply(409, "This account is already linked to a different Google account.", true);
    }

    try {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            googleId: pending.googleId,
            isVerified: true,
            ...(user.profilePhoto || !pending.googlePhoto
              ? {}
              : { profilePhoto: pending.googlePhoto }),
          },
        },
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return reply(
          409,
          "This Google account is already linked to another UniArchive account.",
          true,
        );
      }
      throw error;
    }
    await PendingLink.deleteOne({ _id: pending._id });

    const response = NextResponse.json({ success: true, redirectTo: pending.returnTo });
    // Connecting from settings: already signed in as this user
    const current = await getCurrentSessionUser(request);
    if (current?.userId !== String(user._id)) {
      await startSession(request, response, user, { method: "google", viaEmailCode: true });
    }
    // The code proved this browser can read the account's email
    if (body?.trustDevice === true) await trustDevice(request, response, String(user._id));
    response.cookies.set(LINK_COOKIE, "", linkCookieOptions(0));
    return response;
  } catch (error) {
    return handleRouteError(error, "link-account");
  }
}

export async function DELETE(request: NextRequest) {
  const linkToken = readLinkToken(request.cookies.get(LINK_COOKIE)?.value);
  if (linkToken) {
    try {
      const PendingLink = await getPendingLinkModel();
      await PendingLink.deleteOne({ linkTokenHash: hashToken(linkToken) });
    } catch (error) {
      console.error("link-account: failed to cancel pending link", error);
    }
  }
  return reply(200, "Cancelled.", true);
}
