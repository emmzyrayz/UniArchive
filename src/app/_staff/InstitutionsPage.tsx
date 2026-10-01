// app/_staff/InstitutionsPage.tsx
// Universities, faculties and departments, in /admin and /mod.
// Permission: "manage_institution" (ed_admin, com_admin, webmaster, dev).
import type { StaffArea } from "@/lib/routeAccess";
import { InstitutionsAdmin } from "@/components/admin/InstitutionsAdmin";
import { requireStaffPage } from "./guard";

export async function InstitutionsPage({ area }: { area: StaffArea }) {
  await requireStaffPage(area, "institutions", "manage_institution");
  return <InstitutionsAdmin />;
}
