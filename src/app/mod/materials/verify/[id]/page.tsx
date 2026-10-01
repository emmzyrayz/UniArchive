// app/mod/materials/verify/[id]/page.tsx (shared page: src/app/_staff/VerifyPage.tsx)
import type { Metadata } from "next";
import { VerifyPage } from "@/app/_staff/VerifyPage";

export const metadata: Metadata = { title: "Verify Material · Moderation" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <VerifyPage area="mod" id={(await params).id} />;
}
