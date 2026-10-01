// app/_staff/OutlineEditPage.tsx
// Edit the table of contents / course outline of a published material, in
// /admin and /mod. Permission: "admin.view_submissions" (the same as editing
// a material's details in /materials).
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import type { StaffArea } from "@/lib/routeAccess";
import { OutlinePage } from "@/components/mod/OutlinePage";
import { requireStaffPage } from "./guard";

export async function OutlineEditPage({ area, id }: { area: StaffArea; id: string }) {
  if (!isValidObjectId(id)) notFound();
  await requireStaffPage(area, `materials/${id}/outline`, "admin.view_submissions");
  return <OutlinePage materialId={id} />;
}
