// src/lib/auth/devAuth.ts
// Dev mode: while running `next dev` on your own computer, every request
// counts as signed in as the account named by DEV_USER_UPID in .env.local,
// so sign-in, device codes and expired sessions never get in the way.
//
// It only switches on when ALL of these hold:
//  - NODE_ENV is "development" (`next dev`; `next build` inlines
//    "production", so this code can't run in a deployed build),
//  - not on Vercel (VERCEL is unset),
//  - DEV_USER_UPID is set,
//  - the request comes from this machine (localhost), not the network URL.
// The account must exist (any role). Note that .env.local may point at the
// real database: changes made in dev mode are real changes by that account.
import type { SessionUser } from "@/lib/auth/session";
import { getUserModel } from "@/lib/models/userModel";
import { devAuthUpid } from "./devAuthFlags";

export { devAuthActive, devAuthUpid, isLocalHost } from "./devAuthFlags";

let warned = false;

/** The dev-mode user, or null (with one warning) if DEV_USER_UPID matches nobody. */
export async function getDevSessionUser(): Promise<SessionUser | null> {
  const upid = devAuthUpid();
  if (!upid) return null;
  const User = await getUserModel();
  const user = await User.findOne({ upid })
    .select("role upid uuid isVerified fullName tokenVersion")
    .lean();
  if (!user) {
    if (!warned) {
      warned = true;
      console.warn(`[dev mode] DEV_USER_UPID "${upid}" matches no account; you're signed out.`);
    }
    return null;
  }
  return {
    userId: String(user._id),
    upid: user.upid,
    role: user.role,
    uuid: user.uuid,
    isVerified: user.isVerified,
    fullName: user.fullName,
    tokenVersion: user.tokenVersion ?? 0,
  };
}
