// app/_staff/MaterialsPage.tsx
// UniLibrary material management, in /admin and /mod (reviewers).
import type { StaffArea } from "@/lib/routeAccess";
import { getMaterialModel } from "@/lib/models/materialModel";
import { MaterialsAdmin, type UniversityOption } from "@/components/admin/MaterialsAdmin";
import { requireStaffPage } from "./guard";

export async function MaterialsPage({ area }: { area: StaffArea }) {
  await requireStaffPage(area, "materials", "admin.view_submissions");

  // Only universities that actually have materials, for the filter
  const Material = await getMaterialModel();
  const universities = await Material.aggregate<{ _id: unknown; name?: string; abbr?: string }>([
    { $match: { universityId: { $exists: true } } },
    { $group: { _id: "$universityId", name: { $first: "$universityName" }, abbr: { $first: "$universityAbbr" } } },
    { $sort: { name: 1 } },
  ]);
  const options: UniversityOption[] = universities.map((u) => ({
    id: String(u._id),
    name: u.name ?? "Unknown university",
    abbr: u.abbr,
  }));

  return <MaterialsAdmin universities={options} />;
}
