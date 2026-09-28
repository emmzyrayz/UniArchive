// src/lib/routeAccess.ts
// Path rules shared by src/proxy.ts (server gate) and userContext's
// canAccessRoute (client gate), so the two can't disagree. Keep this module
// dependency-free: the proxy imports it.

/** "/profile/<upid>" is public; "/profile" and "/profile/edit" are the owner's. */
export function isPublicProfilePath(pathname: string): boolean {
  const match = /^\/profile\/([^/]+)\/?$/.exec(pathname);
  return !!match && match[1] !== "edit";
}

// Admin pages open to every reviewer ("admin.view_submissions"), not just
// admins: auditors, course reps and lecturers too. Each page still checks
// the permission itself.
const REVIEWER_ADMIN_PREFIXES = [
  "/admin/submissions",
  "/admin/role-applications",
  "/admin/materials",
  "/admin/comments",
];
// Exact paths only: "/admin" as a prefix would open every admin page
const REVIEWER_ADMIN_PATHS = new Set(["/admin"]);

export function isReviewerAdminPath(pathname: string): boolean {
  return (
    REVIEWER_ADMIN_PATHS.has(pathname) ||
    REVIEWER_ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}
