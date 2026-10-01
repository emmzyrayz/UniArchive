// app/admin/role-applications/page.tsx (shared page: src/app/_staff/RoleApplicationsPage.tsx)
import type { Metadata } from "next";
import { RoleApplicationsPage } from "@/app/_staff/RoleApplicationsPage";

export const metadata: Metadata = { title: "Role Applications · Admin" };

export default function Page() {
  return <RoleApplicationsPage area="admin" />;
}
