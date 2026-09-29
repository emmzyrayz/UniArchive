// src/lib/auth/socialAuth.ts
// Auth.js (next-auth v5) config for Google sign-in. Auth.js only runs the
// OAuth handshake: once Google has verified the user we find or create their
// User document, and /api/auth/social-callback swaps the short-lived Auth.js
// cookie for our own `sessionId` + `session_jwt` cookies, exactly like
// /api/auth/login. Nothing else in the app reads the Auth.js session.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getUserModel, type IUser } from "@/lib/models/userModel";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { normaliseEmail } from "@/lib/auth/tokens";

// Only has to survive the redirect to /api/auth/social-callback
const HANDSHAKE_TTL_SECONDS = 5 * 60;

interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
}

type LinkResult =
  | { ok: true; userId: string }
  | { ok: false; error: "suspended" | "oauth_conflict" };

/**
 * Finds the user for a Google identity, linking it to an existing email
 * account or creating a new account. Google has verified the email, so the
 * account is marked verified.
 */
async function findOrCreateGoogleUser(identity: GoogleIdentity): Promise<LinkResult> {
  const User = await getUserModel();
  const email = normaliseEmail(identity.email);
  const emailHash = hashForSearch(email);

  const existing =
    (await User.findOne({ googleId: identity.sub })) ??
    (await User.findOne({ emailHash }));

  if (existing) {
    if (existing.isSuspended) return { ok: false, error: "suspended" };
    // The email account is already linked to a different Google account
    if (existing.googleId && existing.googleId !== identity.sub) {
      return { ok: false, error: "oauth_conflict" };
    }

    if (!existing.googleId) {
      const update: Record<string, unknown> = { googleId: identity.sub };
      const unset: Record<string, 1> = {};
      if (!existing.profilePhoto && identity.picture) {
        update.profilePhoto = identity.picture;
      }
      if (!existing.isVerified) {
        // Nobody proved they own this email until now, so a password set
        // during that unverified signup can't be trusted (someone could have
        // registered the address first to hijack it). Drop it; the owner can
        // set one through "Forgot password".
        update.isVerified = true;
        unset.password = 1;
        unset.verificationCodeHash = 1;
        unset.verificationCodeExpires = 1;
      }
      await User.updateOne(
        { _id: existing._id },
        Object.keys(unset).length > 0 ? { $set: update, $unset: unset } : { $set: update },
      );
    }
    return { ok: true, userId: String(existing._id) };
  }

  const fullName =
    identity.name?.trim() ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0];
  const [firstFromName, ...restOfName] = fullName.split(/\s+/);

  // No school yet: it's chosen later in profile completion
  let upid = User.generateUPID(fullName, "");
  for (let i = 0; i < 3 && (await User.exists({ upid })); i++) {
    upid = User.generateUPID(fullName, "");
  }

  const user = new User({
    fullName,
    firstName: identity.givenName?.trim() || firstFromName,
    lastName: identity.familyName?.trim() || restOfName.join(" ") || undefined,
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
      const winner = await User.findOne({ googleId: identity.sub }).select("_id");
      if (winner) return { ok: true, userId: String(winner._id) };
    }
    throw error;
  }
  return { ok: true, userId: String(user._id) };
}

export const { handlers, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
  ],
  // No database adapter: Auth.js keeps only a short-lived encrypted cookie
  session: { strategy: "jwt", maxAge: HANDSHAKE_TTL_SECONDS },
  pages: { signIn: "/auth", error: "/auth" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return false;
      if (!profile?.sub || typeof profile.email !== "string") {
        return "/auth?view=signin&error=oauth_failed";
      }
      if (profile.email_verified !== true) {
        return "/auth?view=signin&error=oauth_unverified";
      }

      try {
        const result = await findOrCreateGoogleUser({
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          givenName: profile.given_name,
          familyName: profile.family_name,
          picture: typeof profile.picture === "string" ? profile.picture : null,
        });
        if (!result.ok) return `/auth?view=signin&error=${result.error}`;
        // Becomes the Auth.js token's `sub`, read back by social-callback
        user.id = result.userId;
        return true;
      } catch (error) {
        console.error("[google-oauth] signIn failed:", error);
        return "/auth?view=signin&error=oauth_failed";
      }
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
