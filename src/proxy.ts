// src/proxy.ts
// Server-side route protection (Next 16's replacement for middleware).
//
// Pages: require a valid `session_jwt` (15-minute HS256 JWT). If it has
// expired but a `sessionId` session cookie is present, the request is sent
// through /api/auth/refresh to mint a new JWT and come straight back, so
// users aren't signed out every 15 minutes.
//
// API routes are not redirected here: they authenticate against the database
// session themselves (lib/auth/session.ts), and a redirect would hand fetch()
// an HTML sign-in page instead of a JSON 401.
//
// Role-sensitive pages (/admin, /mod, /profile/edit) also compare the JWT's
// tokenVersion with the copy in Redis, so a revoked JWT (suspension, role
// change) can't keep routing by an old role for its last 15 minutes. That
// one Redis read is skipped everywhere else to keep page loads fast.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_JWT_COOKIE, verifySessionJwt } from "@/lib/auth/jwt";
import {
  canEnterStaffArea,
  isPublicMaterialPath,
  isPublicProfilePath,
  modPathFor,
  staffAreaOf,
} from "@/lib/routeAccess";
import { getCachedTokenVersion } from "@/lib/auth/tokenVersionCache";

// /unilibrary: anyone can browse; reading a material (/read/...) needs a session
const PUBLIC_PATHS = new Set([
  "/", "/about", "/contact", "/help", "/offline", "/unilibrary", "/privacy", "/terms",
]);
const PUBLIC_PREFIXES = ["/auth", "/_next", "/api"];
// Pages where a revoked JWT's old role or access matters (tokenVersion check)
const SENSITIVE_PREFIXES = ["/admin", "/mod", "/profile/edit"];
// Staff areas: /admin for platform admins, /mod for moderators and admins
// (lib/routeAccess.ts). Each page still checks its own permission.

// Files served from /public (pdf.worker.min.mjs, icons, manifest, sw.js, ...)
const STATIC_FILE = /\.[a-zA-Z0-9]+$/;
// Generated social cards (app/**/opengraph-image.tsx): crawlers fetch these
// signed out, and they have no file extension
const METADATA_IMAGE = /\/(opengraph|twitter)-image(-[\w-]+)?$/;

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    matchesPrefix(pathname, PUBLIC_PREFIXES) ||
    // Other users' public profiles; /profile and /profile/edit stay private
    isPublicProfilePath(pathname) ||
    isPublicMaterialPath(pathname) ||
    STATIC_FILE.test(pathname) ||
    METADATA_IMAGE.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const claims = await verifySessionJwt(
    request.cookies.get(SESSION_JWT_COOKIE)?.value,
  );
  const from = pathname + search;

  if (!claims) {
    // JWT missing/expired but a session exists: renew and come back
    if (request.cookies.has("sessionId")) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("from", from);
      return NextResponse.redirect(refreshUrl);
    }
    const signInUrl = new URL("/auth", request.url);
    signInUrl.searchParams.set("view", "signin");
    signInUrl.searchParams.set("from", from);
    return NextResponse.redirect(signInUrl);
  }

  if (matchesPrefix(pathname, SENSITIVE_PREFIXES)) {
    const cachedVersion = await getCachedTokenVersion(claims.sub);
    // A different version means this JWT predates a suspension or role
    // change. Refresh checks the session in the database: a revoked one is
    // signed out, a valid one gets a current JWT (and the cache is re-synced,
    // so a stale cache entry can't cause a loop). No entry: skip the check.
    if (cachedVersion !== null && cachedVersion !== claims.tokenVersion) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("from", from);
      return NextResponse.redirect(refreshUrl);
    }
  }

  const area = staffAreaOf(pathname);
  if (area && !canEnterStaffArea(claims.role, area)) {
    // A moderator on an old /admin link: send them to the /mod copy
    const modPath =
      area === "admin" && canEnterStaffArea(claims.role, "mod") ? modPathFor(pathname) : null;
    if (modPath) return NextResponse.redirect(new URL(modPath + search, request.url));

    const signInUrl = new URL("/auth", request.url);
    signInUrl.searchParams.set("view", "signin");
    signInUrl.searchParams.set("error", "forbidden");
    signInUrl.searchParams.set("from", from);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
