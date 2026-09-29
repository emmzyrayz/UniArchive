// src/lib/auth/socialAuth.ts
// Auth.js (next-auth v5) config for Google sign-in. Auth.js only runs the
// OAuth handshake and keeps the verified Google identity in a short-lived
// encrypted cookie. /api/auth/social-callback reads it and decides what
// happens (sign in, confirm a link to an existing account, or ask for a
// new-device code) - see lib/auth/googleAccount.ts. Nothing else in the app
// reads the Auth.js session.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Only has to survive the redirect to /api/auth/social-callback
const HANDSHAKE_TTL_SECONDS = 5 * 60;

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
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      if (!profile?.sub || typeof profile.email !== "string") {
        return "/auth?view=signin&error=oauth_failed";
      }
      if (profile.email_verified !== true) {
        return "/auth?view=signin&error=oauth_unverified";
      }
      return true;
    },
    // The token's `sub` is the Google account id (the provider's user.id)
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
