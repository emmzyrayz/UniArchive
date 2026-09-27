// app/admin/materials/page.tsx
// UniLibrary material management. Open to reviewers
// ("admin.view_submissions"); the proxy only guarantees a session here.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { getMaterialModel } from "@/lib/models/materialModel";
import { MaterialsAdmin, type UniversityOption } from "@/components/admin/MaterialsAdmin";

export const metadata: Metadata = { title: "Materials · Admin · UniArchive" };

export default async function AdminMaterialsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Fmaterials");
  if (!can(session.role, "admin.view_submissions")) redirect("/home");

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
