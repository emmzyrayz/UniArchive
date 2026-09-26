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
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_JWT_COOKIE, verifySessionJwt } from "@/lib/auth/jwt";
import type { UserRole } from "@/types/roles";

const PUBLIC_PATHS = new Set(["/", "/about", "/contact", "/help", "/offline"]);
const PUBLIC_PREFIXES = ["/auth", "/_next", "/api"];
const ADMIN_PREFIXES = ["/admin", "/moderation"];
const ADMIN_ROLES: UserRole[] = ["ed_admin", "com_admin", "webmaster", "dev"];
// Admin pages open to non-admin reviewers (auditors, lecturers, ...). The
// proxy only requires a session for these; the page checks the permission.
const PAGE_CHECKED_ADMIN_PREFIXES = ["/admin/submissions"];

// Files served from /public (pdf.worker.min.mjs, icons, manifest, sw.js, ...)
const STATIC_FILE = /\.[a-zA-Z0-9]+$/;

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    matchesPrefix(pathname, PUBLIC_PREFIXES) ||
    STATIC_FILE.test(pathname)
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

  if (
    matchesPrefix(pathname, ADMIN_PREFIXES) &&
    !matchesPrefix(pathname, PAGE_CHECKED_ADMIN_PREFIXES) &&
    !ADMIN_ROLES.includes(claims.role)
  ) {
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
