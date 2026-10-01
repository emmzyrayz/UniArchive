// app/admin/materials/verify/[id]/page.tsx (shared page: src/app/_staff/VerifyPage.tsx)
import type { Metadata } from "next";
import { VerifyPage } from "@/app/_staff/VerifyPage";

export const metadata: Metadata = { title: "Verify Material · Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <VerifyPage area="admin" id={(await params).id} />;
}
