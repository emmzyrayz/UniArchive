// GET /api/auth/social-callback?from=/some/page[&intent=connect]
// Where Auth.js sends the browser after Google sign-in. Reads the verified
// Google identity from the short-lived Auth.js session, deletes that cookie
// and then either:
//  - signs in (trusted device, or a brand-new / just-verified account whose
//    email Google has just proven - that browser becomes trusted),
//  - asks for a new-device code (/auth/verify-device), or
//  - asks the owner of an existing email account to confirm the link with a
//    code (/auth/link-account). If the account is already linked to another
//    Google account, confirming replaces it (password + code).
//
// intent=connect comes from settings: a signed-in user links Google (or
// swaps in a different Google account) with the same confirmation step.
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/socialAuth";
import { checkRateLimit } from "@/lib/rateLimitRedis";
import { getClientIp } from "@/lib/api";
import { safeReturnPath, startSession } from "@/lib/auth/startSession";
import {
  createPendingLink,
  resolveGoogleAccount,
  resolveGoogleConnect,
  type GoogleIdentity,
} from "@/lib/auth/googleAccount";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { LINK_COOKIE, linkCookieOptions } from "@/lib/auth/linkCookie";
import {
  isDeviceTrusted,
  readDeviceToken,
  refreshDeviceCookie,
  setChallengeCookie,
  startDeviceChallenge,
  trustDevice,
} from "@/lib/auth/deviceRecognition";

// Auth.js session cookie; large tokens are split into .0, .1, ... chunks
const AUTHJS_SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

function clearAuthJsSession(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!AUTHJS_SESSION_COOKIE.test(name)) continue;
    response.cookies.set(name, "", {
      httpOnly: true,
      // __Secure- cookies can only be overwritten by a Secure cookie
      secure: name.startsWith("__Secure-") || process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  // The Auth.js session has done its job whichever way this goes
  clearAuthJsSession(request, response);
  return response;
}

const failure = (request: NextRequest, error: string) =>
  redirectTo(request, `/auth?view=signin&error=${error}`);

const CONNECT_RETURN = "/settings?tab=privacy";

const connectResult = (request: NextRequest, result: string) =>
  redirectTo(request, `${CONNECT_RETURN}&google=${result}`);

/** Codes are emailed from here, so cap how often one IP can trigger them. */
async function emailAllowed(request: NextRequest): Promise<boolean> {
  const { success } = await checkRateLimit(
    request,
    "authEmail",
    `social-callback:${getClientIp(request)}`,
  );
  return success;
}

export async function GET(request: NextRequest) {
  try {
    const returnTo = safeReturnPath(request.nextUrl.searchParams.get("from"));
    const google = (await auth())?.user;
    if (!google?.id || !google.email) return failure(request, "oauth_failed");

    const identity = {
      sub: google.id,
      email: google.email,
      name: google.name,
      picture: google.image,
    };

    if (request.nextUrl.searchParams.get("intent") === "connect") {
      const session = await getCurrentSessionUser(request);
      if (session) return connectGoogle(request, session.userId, identity);
      // Signed out since leaving settings: carry on as a normal sign-in
    }

    const result = await resolveGoogleAccount(identity);
    if (result.kind === "error") return failure(request, result.error);

    if (result.kind === "link") {
      if (!(await emailAllowed(request))) return failure(request, "rate_limited");
      const linkToken = await createPendingLink(result.user, identity, returnTo, result.relink);
      if (!linkToken) return failure(request, "email_failed");
      return toLinkPage(request, linkToken);
    }

    const { user, emailJustProven } = result;
    const userId = String(user._id);
    const deviceToken = readDeviceToken(request);

    if (emailJustProven || (await isDeviceTrusted(userId, deviceToken))) {
      const response = redirectTo(request, returnTo);
      await startSession(request, response, user, { method: "google" });
      if (emailJustProven) await trustDevice(request, response, userId);
      else if (deviceToken) refreshDeviceCookie(response, deviceToken);
      return response;
    }

    // Signed in with Google, but from a device we don't know yet
    if (!(await emailAllowed(request))) return failure(request, "rate_limited");
    const challenge = await startDeviceChallenge(request, user, returnTo, "google");
    if (!challenge) return failure(request, "email_failed");
    const response = redirectTo(request, "/auth/verify-device");
    setChallengeCookie(response, challenge.rawToken);
    return response;
  } catch (error) {
    console.error("[social-callback] failed:", error);
    return failure(request, "oauth_failed");
  }
}

function toLinkPage(request: NextRequest, linkToken: string) {
  const response = redirectTo(request, "/auth/link-account");
  response.cookies.set(LINK_COOKIE, linkToken, linkCookieOptions());
  return response;
}

async function connectGoogle(request: NextRequest, userId: string, identity: GoogleIdentity) {
  const result = await resolveGoogleConnect(userId, identity);
  if (result.kind === "already") return connectResult(request, "connected");
  if (result.kind === "error") return connectResult(request, result.error);

  if (!(await emailAllowed(request))) return connectResult(request, "rate_limited");
  // Where /auth/link-account goes once the code is confirmed
  const returnTo = `${CONNECT_RETURN}&google=linked`;
  const linkToken = await createPendingLink(result.user, identity, returnTo, result.relink);
  if (!linkToken) return connectResult(request, "email_failed");
  return toLinkPage(request, linkToken);
}
