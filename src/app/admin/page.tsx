// app/admin/page.tsx (shared page: src/app/_staff/OverviewPage.tsx)
import type { Metadata } from "next";
import { OverviewPage } from "@/app/_staff/OverviewPage";

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return <OverviewPage area="admin" />;
}
