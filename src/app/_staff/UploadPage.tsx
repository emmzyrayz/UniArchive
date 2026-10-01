// app/_staff/UploadPage.tsx
// Bulk upload of platform PDFs, in /admin and /mod. Permission:
// "material.ingest" (every moderator and admin).
import type { StaffArea } from "@/lib/routeAccess";
import { BulkUploader } from "@/components/mod/BulkUploader";
import { requireStaffPage } from "./guard";

export async function UploadPage({ area }: { area: StaffArea }) {
  await requireStaffPage(area, "materials/upload", "material.ingest");
  return <BulkUploader />;
}
