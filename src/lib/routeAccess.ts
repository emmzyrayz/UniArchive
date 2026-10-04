// src/lib/routeAccess.ts
// Path rules shared by src/proxy.ts (server gate) and userContext's
// canAccessRoute (client gate), so the two can't disagree. Keep this module
// free of server-only imports: the proxy imports it.
import { isAdminRole, isStaffRole, type UserRole } from "@/types/roles";

/** Pages anyone can open signed out (besides the prefixes and patterns below). */
export const PUBLIC_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/", "/about", "/contact", "/help", "/offline", "/unilibrary", "/privacy", "/terms",
  // The personal link in broadcasts works without signing in
  "/email-preferences",
]);

/** "/profile/<upid>" is public; "/profile" and "/profile/edit" are the owner's. */
export function isPublicProfilePath(pathname: string): boolean {
  const match = /^\/profile\/([^/]+)\/?$/.exec(pathname);
  return !!match && match[1] !== "edit";
}

/** "/materials/<id>": a UniLibrary material's page is public, like the feed. */
export function isPublicMaterialPath(pathname: string): boolean {
  return /^\/materials\/[^/]+\/?$/.test(pathname);
}

// Staff areas. /admin is for platform admins only; /mod is for moderators
// and admins. Each page still checks its own permission (e.g. "manage_users").
export type StaffArea = "admin" | "mod";

export function staffAreaOf(pathname: string): StaffArea | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/mod" || pathname.startsWith("/mod/")) return "mod";
  return null;
}

export function canEnterStaffArea(role: UserRole, area: StaffArea): boolean {
  return area === "admin" ? isAdminRole(role) : isStaffRole(role);
}

// Admin pages that also exist under /mod (same shared page), so a moderator
// following an old /admin link (bookmarks, emails) lands on the /mod copy
const MIRRORED_SECTIONS = new Set([
  "submissions",
  "role-applications",
  "materials",
  "comments",
  "institutions",
  "suggestions",
]);

/** "/admin/submissions/x" -> "/mod/submissions/x"; null when /mod has no copy. */
export function modPathFor(adminPath: string): string | null {
  if (adminPath === "/admin") return "/mod";
  const match = /^\/admin\/([^/]+)(\/.*)?$/.exec(adminPath);
  if (!match || !MIRRORED_SECTIONS.has(match[1])) return null;
  return `/mod/${match[1]}${match[2] ?? ""}`;
}
