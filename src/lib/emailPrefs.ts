// src/lib/emailPrefs.ts
// Which bulk emails (Brevo broadcasts) a user gets. Two kinds:
//   - announcements: platform news and notices. On unless the user turns it
//     off or unsubscribes.
//   - newsletter: education content and promotions. Off until the user
//     opts in (consent for marketing).
// Transactional email (codes, review results, /admin/mail) ignores these.
//
// Every broadcast carries a personal "manage email preferences" link
// (/email-preferences?u=<upid>&t=<token>) that works without signing in;
// the token is an HMAC of the user id, so it can't be guessed or reused for
// another account and only ever opens this one page.
import crypto from "crypto";
import { Types } from "mongoose";
import { getUserModel, type IUser } from "@/lib/models/userModel";
import { absoluteUrl } from "@/lib/seo";
import { brevoConfigured, unblockBrevoContact } from "@/lib/brevo";
import { decryptSensitiveData } from "@/lib/encryption";

export type EmailKind = "announcements" | "newsletter";
export const EMAIL_KINDS: EmailKind[] = ["announcements", "newsletter"];

export interface EmailPrefs {
  announcements: boolean;
  newsletter: boolean;
}

export const DEFAULT_EMAIL_PREFS: EmailPrefs = { announcements: true, newsletter: false };

/** The stored preferences with defaults for accounts that never set them. */
export function effectiveEmailPrefs(stored?: Partial<EmailPrefs> | null): EmailPrefs {
  return {
    announcements: stored?.announcements ?? DEFAULT_EMAIL_PREFS.announcements,
    newsletter: stored?.newsletter ?? DEFAULT_EMAIL_PREFS.newsletter,
  };
}

// --- The no-sign-in preferences link ----------------------------------------

function prefsKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters");
  // A key of its own, derived from the app secret (domain-separated)
  return crypto.createHmac("sha256", secret).update("uniarchive:email-prefs:v1").digest();
}

export function emailPrefsToken(userId: string | Types.ObjectId): string {
  return crypto.createHmac("sha256", prefsKey()).update(String(userId)).digest("hex").slice(0, 32);
}

export function isValidEmailPrefsToken(userId: string | Types.ObjectId, token: string): boolean {
  if (!/^[a-f0-9]{32}$/.test(token)) return false;
  return crypto.timingSafeEqual(Buffer.from(emailPrefsToken(userId), "hex"), Buffer.from(token, "hex"));
}

/** The personal link put in every broadcast. */
export function emailPrefsUrl(user: { _id: string | Types.ObjectId; upid: string }): string {
  const query = new URLSearchParams({ u: user.upid, t: emailPrefsToken(user._id) });
  return absoluteUrl(`/email-preferences?${query}`);
}

// --- Updating ---------------------------------------------------------------

type PrefsUser = Pick<IUser, "email" | "emailPrefs"> & { _id: Types.ObjectId };

/**
 * Saves a change and returns the new preferences. Turning a kind back on
 * after an unsubscribe also lifts Brevo's block on the address (Brevo
 * blocks a contact for every campaign once they unsubscribe from one).
 */
export async function updateEmailPrefs(
  userId: string | Types.ObjectId,
  change: Partial<EmailPrefs>,
  source: "settings" | "link",
): Promise<EmailPrefs | null> {
  const User = await getUserModel();
  const set: Record<string, unknown> = { "emailPrefs.updatedAt": new Date(), "emailPrefs.source": source };
  for (const kind of EMAIL_KINDS) {
    if (typeof change[kind] === "boolean") set[`emailPrefs.${kind}`] = change[kind];
  }
  const user = await User.findByIdAndUpdate(userId, { $set: set }, { returnDocument: "after" })
    .select("email emailPrefs")
    .lean<PrefsUser>();
  if (!user) return null;

  const prefs = effectiveEmailPrefs(user.emailPrefs);
  const optedBackIn = EMAIL_KINDS.some((k) => change[k] === true);
  if (optedBackIn && user.emailPrefs?.brevoBlocked && brevoConfigured()) {
    try {
      await unblockBrevoContact(decryptSensitiveData(user.email));
      await User.updateOne({ _id: user._id }, { $set: { "emailPrefs.brevoBlocked": false } });
    } catch (error) {
      // The preference is saved either way; the next import retries it
      console.error("[email-prefs] could not unblock Brevo contact:", error);
    }
  }
  return prefs;
}
