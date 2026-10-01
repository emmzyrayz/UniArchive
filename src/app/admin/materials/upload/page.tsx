// app/admin/materials/upload/page.tsx (shared page: src/app/_staff/UploadPage.tsx)
import type { Metadata } from "next";
import { UploadPage } from "@/app/_staff/UploadPage";

export const metadata: Metadata = { title: "Upload Materials · Admin" };

export default function Page() {
  return <UploadPage area="admin" />;
}
