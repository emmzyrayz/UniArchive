// app/mod/materials/page.tsx (shared page: src/app/_staff/MaterialsPage.tsx)
import type { Metadata } from "next";
import { MaterialsPage } from "@/app/_staff/MaterialsPage";

export const metadata: Metadata = { title: "Materials · Moderation" };

export default function Page() {
  return <MaterialsPage area="mod" />;
}
