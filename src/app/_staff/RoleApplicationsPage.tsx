// app/_staff/RoleApplicationsPage.tsx
// The role application queue, in /admin and /mod. Reviewers can view it;
// only user admins (com_admin, webmaster, dev) can decide.
import type { StaffArea } from "@/lib/routeAccess";
import {
  ROLE_APPLICATION_STATUSES,
  getRoleApplicationModel,
  type RoleApplicationStatus,
} from "@/lib/models/roleApplicationModel";
import { canDecideRoleApplications } from "@/lib/roleApplications";
import { RoleApplicationsReview } from "@/components/admin/RoleApplicationsReview";
import { requireStaffPage } from "./guard";

export async function RoleApplicationsPage({ area }: { area: StaffArea }) {
  const session = await requireStaffPage(area, "role-applications", "admin.view_submissions");

  const RoleApplication = await getRoleApplicationModel();
  const grouped = await RoleApplication.aggregate<{ _id: RoleApplicationStatus; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(ROLE_APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
    RoleApplicationStatus,
    number
  >;
  for (const g of grouped) counts[g._id] = g.count;

  return (
    <RoleApplicationsReview
      initialCounts={counts}
      viewer={{ userId: session.userId, canDecide: canDecideRoleApplications(session.role) }}
    />
  );
}
