// app/_staff/VerifyPage.tsx
// The verify workspace for one platform file, in /admin and /mod.
// Permission: "material.ingest"; the API decides which files the viewer may
// open (their own uploads; admins any; gifts need "material.review_gifts").
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import type { StaffArea } from "@/lib/routeAccess";
import { isAdminRole } from "@/types/roles";
import { VerifyWorkspace } from "@/components/mod/VerifyWorkspace";
import { requireStaffPage } from "./guard";

export async function VerifyPage({ area, id }: { area: StaffArea; id: string }) {
  if (!isValidObjectId(id)) notFound();
  const session = await requireStaffPage(area, `materials/verify/${id}`, "material.ingest");
  return <VerifyWorkspace initialId={id} isAdmin={isAdminRole(session.role)} />;
}
