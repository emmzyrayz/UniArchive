// src/lib/auth/googleAccount.ts
// Decides what a verified Google identity means for our accounts. Called by
// /api/auth/social-callback once Auth.js has finished the OAuth handshake.
import type { HydratedDocument } from "mongoose";
import { getUserModel, type IUser } from "@/lib/models/userModel";
import {
  LINK_OTP_TTL_MS,
  getPendingLinkModel,
} from "@/lib/models/pendingLinkModel";
import {
  decryptSensitiveData,
  encryptSensitiveData,
  hashForSearch,
} from "@/lib/encryption";
import {
  generateOtp,
  generateToken,
  hashOtp,
  hashToken,
  maskEmailAddress,
  normaliseEmail,
} from "@/lib/auth/tokens";
import { sendLinkConfirmationEmail } from "@/utils/email";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

export type GoogleResolution =
  /**
   * Sign in as this user. `emailJustProven` is true for a brand-new account
   * or a never-verified one that Google just verified: this browser has
   * proven the email, so it can be trusted without another code.
   */
  | { kind: "signin"; user: HydratedDocument<IUser>; emailJustProven: boolean }
  /** An existing verified account has this email: confirm by code first. */
  | { kind: "link"; user: HydratedDocument<IUser> }
  | { kind: "error"; error: "suspended" | "oauth_conflict" };

export async function resolveGoogleAccount(identity: GoogleIdentity): Promise<GoogleResolution> {
  const User = await getUserModel();

  const linked = await User.findOne({ googleId: identity.sub });
  if (linked) {
    if (linked.isSuspended) return { kind: "error", error: "suspended" };
    return { kind: "signin", user: linked, emailJustProven: false };
  }

  const email = normaliseEmail(identity.email);
  const emailHash = hashForSearch(email);
  const existing = await User.findOne({ emailHash });

  if (existing) {
    if (existing.isSuspended) return { kind: "error", error: "suspended" };
    // Already linked to a different Google account
    if (existing.googleId) return { kind: "error", error: "oauth_conflict" };

    if (existing.isVerified) return { kind: "link", user: existing };

    // Nobody had proven they own this email until Google just did, so a
    // password set during that unverified signup can't be trusted (someone
    // could have registered the address first to hijack it). Link straight
    // away and drop the password; the owner can set one via "Forgot password".
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          googleId: identity.sub,
          isVerified: true,
          ...(existing.profilePhoto || !identity.picture ? {} : { profilePhoto: identity.picture }),
        },
        $unset: { password: 1, verificationCodeHash: 1, verificationCodeExpires: 1 },
      },
    );
    const updated = await User.findById(existing._id);
    if (!updated) throw new Error("User vanished while linking Google");
    return { kind: "signin", user: updated, emailJustProven: true };
  }

  return { kind: "signin", user: await createGoogleUser(identity, email, emailHash), emailJustProven: true };
}

async function createGoogleUser(
  identity: GoogleIdentity,
  email: string,
  emailHash: string,
): Promise<HydratedDocument<IUser>> {
  const User = await getUserModel();
  const fullName = identity.name?.trim() || email.split("@")[0];
  const [firstName, ...rest] = fullName.split(/\s+/);

  // No school yet: it's chosen later in profile completion
  let upid = User.generateUPID(fullName, "");
  for (let i = 0; i < 3 && (await User.exists({ upid })); i++) {
    upid = User.generateUPID(fullName, "");
  }

  const user = new User({
    fullName,
    firstName,
    lastName: rest.join(" ") || undefined,
    email: encryptSensitiveData(email),
    emailHash,
    googleId: identity.sub,
    profilePhoto: identity.picture ?? undefined,
    role: "student",
    uuid: User.generateUUID(),
    upid,
    isVerified: true,
  } satisfies Partial<IUser>);

  try {
    await user.save();
  } catch (error) {
    // Lost a race with a concurrent sign-in for the same Google account
    if ((error as { code?: number }).code === 11000) {
      const winner = await User.findOne({ googleId: identity.sub });
      if (winner) return winner;
    }
    throw error;
  }
  return user;
}

/**
 * Records a pending link and emails the account's owner a code. Returns the
 * raw link token for the `ua_link` cookie, or null if the email didn't send.
 */
export async function createPendingLink(
  user: HydratedDocument<IUser>,
  identity: GoogleIdentity,
  returnTo: string,
): Promise<string | null> {
  const PendingLink = await getPendingLinkModel();
  const accountEmail = decryptSensitiveData(user.email);
  const otp = generateOtp();
  const linkToken = generateToken();

  const pending = await PendingLink.create({
    userId: user._id,
    maskedEmail: maskEmailAddress(accountEmail),
    linkTokenHash: hashToken(linkToken),
    googleId: identity.sub,
    googleEmail: normaliseEmail(identity.email),
    googleName: identity.name?.trim() ?? "",
    googlePhoto: identity.picture ?? undefined,
    otpHash: hashOtp(otp),
    otpExpiresAt: new Date(Date.now() + LINK_OTP_TTL_MS),
    returnTo,
  });

  const sent = await sendLinkConfirmationEmail({
    toEmail: accountEmail,
    toName: user.fullName,
    otp,
    googleEmail: pending.googleEmail,
  });
  if (!sent) {
    await PendingLink.deleteOne({ _id: pending._id });
    return null;
  }
  return linkToken;
}
