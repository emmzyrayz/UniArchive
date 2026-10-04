// app/admin/users/page.tsx
// User management. Permission: "manage_users" (com_admin, webmaster, dev);
// changing roles additionally needs "assign_role".
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsersPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Fusers");
  if (!can(session.role, "manage_users")) redirect("/admin");

  return (
    <UsersAdmin
      viewer={{
        userId: session.userId,
        role: session.role,
        canAssignRoles: can(session.role, "assign_role"),
        canMail: can(session.role, "mail.send_user"),
      }}
    />
  );
}
