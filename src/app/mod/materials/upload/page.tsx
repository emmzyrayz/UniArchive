// app/mod/materials/upload/page.tsx (shared page: src/app/_staff/UploadPage.tsx)
import type { Metadata } from "next";
import { UploadPage } from "@/app/_staff/UploadPage";

export const metadata: Metadata = { title: "Upload Materials · Moderation" };

export default function Page() {
  return <UploadPage area="mod" />;
}
