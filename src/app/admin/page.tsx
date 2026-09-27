// app/admin/page.tsx
// The admin dashboard. Open to every reviewer ("admin.view_submissions");
// links to user and institution pages only show for those who can use them.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin · UniArchive" };

export default async function AdminPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin");
  if (!can(session.role, "admin.view_submissions")) redirect("/home");

  return (
    <AdminDashboard
      viewer={{
        canManageUsers: can(session.role, "manage_users"),
        canManageInstitutions: can(session.role, "manage_institution"),
      }}
    />
  );
}
