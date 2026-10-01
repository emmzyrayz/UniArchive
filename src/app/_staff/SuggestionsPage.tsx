// app/_staff/SuggestionsPage.tsx
// Students' school suggestions, in /admin and /mod.
// Permission: "manage_institution" (ed_admin, com_admin, webmaster, dev).
import type { StaffArea } from "@/lib/routeAccess";
import { SuggestionsAdmin } from "@/components/admin/SuggestionsAdmin";
import { requireStaffPage } from "./guard";

export async function SuggestionsPage({ area }: { area: StaffArea }) {
  await requireStaffPage(area, "suggestions", "manage_institution");
  return <SuggestionsAdmin />;
}
