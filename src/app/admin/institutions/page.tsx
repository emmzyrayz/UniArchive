// app/admin/institutions/page.tsx (shared page: src/app/_staff/InstitutionsPage.tsx)
import type { Metadata } from "next";
import { InstitutionsPage } from "@/app/_staff/InstitutionsPage";

export const metadata: Metadata = { title: "Institutions · Admin" };

export default function Page() {
  return <InstitutionsPage area="admin" />;
}
