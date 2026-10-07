// app/admin/materials/drive-inbox/page.tsx
// The platform Google Drive inbox. Permission: "material.drive_inbox"
// (com_admin, dev); admin only, no /mod copy.
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireStaffPage } from "@/app/_staff/guard";
import { DriveInboxAdmin } from "@/components/admin/DriveInboxAdmin";

export const metadata: Metadata = { title: "Google Drive inbox · Admin" };

export default async function AdminDriveInboxPage() {
  await requireStaffPage("admin", "materials/drive-inbox", "material.drive_inbox");
  return (
    <Suspense>
      <DriveInboxAdmin />
    </Suspense>
  );
}
