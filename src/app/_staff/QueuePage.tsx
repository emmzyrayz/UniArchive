// app/_staff/QueuePage.tsx
// The platform upload queue, in /admin and /mod. Everyone with
// "material.ingest" sees their own uploads; admins also see every staff
// upload, and "material.review_gifts" adds the gifts tab.
import { can } from "@/lib/auth/permissions";
import type { StaffArea } from "@/lib/routeAccess";
import { isAdminRole } from "@/types/roles";
import { PlatformQueue } from "@/components/mod/PlatformQueue";
import { requireStaffPage } from "./guard";

export async function QueuePage({ area }: { area: StaffArea }) {
  const session = await requireStaffPage(area, "materials/queue", "material.ingest");
  const scopes: ("mine" | "all" | "gifts" | "inbox")[] = ["mine"];
  if (isAdminRole(session.role)) scopes.push("all");
  if (can(session.role, "material.review_gifts")) scopes.push("gifts");
  // PDFs shared with UniArchive's Gmail: a pool for all staff
  scopes.push("inbox");
  return <PlatformQueue scopes={scopes} />;
}
