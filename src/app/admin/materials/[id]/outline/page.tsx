// app/admin/materials/[id]/outline/page.tsx (shared page: src/app/_staff/OutlineEditPage.tsx)
import type { Metadata } from "next";
import { OutlineEditPage } from "@/app/_staff/OutlineEditPage";

export const metadata: Metadata = { title: "Edit Outline · Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OutlineEditPage area="admin" id={(await params).id} />;
}
