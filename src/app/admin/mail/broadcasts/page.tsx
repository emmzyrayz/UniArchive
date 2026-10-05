// app/admin/mail/broadcasts/page.tsx
// Bulk email drafts and history (Brevo). Permission: "mail.broadcast"
// (com_admin, dev). ?new=1 opens the template picker.
import type { Metadata } from "next";
import { requireStaffPage } from "@/app/_staff/guard";
import { BroadcastsAdmin } from "@/components/admin/broadcasts/BroadcastsAdmin";

export const metadata: Metadata = { title: "Broadcasts · Admin" };

export default async function AdminBroadcastsPage({ searchParams }: { searchParams: Promise<{ new?: string | string[] }> }) {
  await requireStaffPage("admin", "mail/broadcasts", "mail.broadcast");
  const { new: startNew } = await searchParams;
  return <BroadcastsAdmin startNew={startNew === "1"} />;
}
