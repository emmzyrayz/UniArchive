// app/admin/institutions/page.tsx
// Universities, faculties and departments.
// Permission: "manage_institution" (ed_admin, com_admin, webmaster, dev).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { InstitutionsAdmin } from "@/components/admin/InstitutionsAdmin";

export const metadata: Metadata = { title: "Institutions · Admin" };

export default async function AdminInstitutionsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Finstitutions");
  if (!can(session.role, "manage_institution")) redirect("/admin");

  return <InstitutionsAdmin />;
}
