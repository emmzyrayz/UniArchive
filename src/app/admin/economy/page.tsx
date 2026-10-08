// app/admin/economy/page.tsx
// The credits economy. Permission: "economy.manage" (com_admin, dev); admin
// only, no /mod copy.
import type { Metadata } from "next";
import { requireStaffPage } from "@/app/_staff/guard";
import { EconomyAdmin } from "@/components/admin/EconomyAdmin";

export const metadata: Metadata = { title: "Credits economy · Admin" };

export default async function AdminEconomyPage() {
  await requireStaffPage("admin", "economy", "economy.manage");
  return <EconomyAdmin />;
}
