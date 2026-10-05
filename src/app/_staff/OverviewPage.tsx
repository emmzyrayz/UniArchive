// app/_staff/OverviewPage.tsx
// /admin and /mod overview. Open to reviewers ("admin.view_submissions");
// links only show for pages the viewer can use in this area.
import { can } from "@/lib/auth/permissions";
import type { StaffArea } from "@/lib/routeAccess";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireStaffPage } from "./guard";

export async function OverviewPage({ area }: { area: StaffArea }) {
  const session = await requireStaffPage(area, "", "admin.view_submissions");
  return (
    <AdminDashboard
      viewer={{
        // User management only exists in /admin
        canManageUsers: area === "admin" && can(session.role, "manage_users"),
        canManageInstitutions: can(session.role, "manage_institution"),
        canIngest: can(session.role, "material.ingest"),
        // Mail only exists in /admin
        canMail: area === "admin" && can(session.role, "mail.send_user"),
        canBroadcast: area === "admin" && can(session.role, "mail.broadcast"),
        canSurveys: area === "admin" && can(session.role, "survey.manage"),
      }}
    />
  );
}
