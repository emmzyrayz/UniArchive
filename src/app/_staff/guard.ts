// app/_staff/guard.ts
// Shared sign-in and permission check for the staff pages that live in both
// /admin and /mod. The proxy has already checked the area itself.
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can, type Action } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { StaffArea } from "@/lib/routeAccess";

/**
 * The signed-in user, or a redirect: to sign-in (coming back to `section`)
 * when signed out, to the area's overview (or /home from the overview) when
 * they lack `action`.
 */
export async function requireStaffPage(
  area: StaffArea,
  section: string,
  action: Action,
): Promise<SessionUser> {
  const path = section ? `/${area}/${section}` : `/${area}`;
  const session = await getServerSessionUser();
  if (!session) redirect(`/auth?view=signin&from=${encodeURIComponent(path)}`);
  if (!can(session.role, action)) redirect(section ? `/${area}` : "/home");
  return session;
}
