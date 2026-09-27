// app/admin/role-applications/page.tsx
// The role application queue. Like /admin/submissions, the proxy only
// guarantees a session; anyone with "admin.view_submissions" can view it,
// and only user admins (com_admin, webmaster, dev) can decide.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import {
  ROLE_APPLICATION_STATUSES,
  getRoleApplicationModel,
  type RoleApplicationStatus,
} from "@/lib/models/roleApplicationModel";
import { canDecideRoleApplications } from "@/lib/roleApplications";
import { RoleApplicationsReview } from "@/components/admin/RoleApplicationsReview";

export const metadata: Metadata = { title: "Role Applications · UniArchive" };

export default async function AdminRoleApplicationsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Frole-applications");
  if (!can(session.role, "admin.view_submissions")) redirect("/home");

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
