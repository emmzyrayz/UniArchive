// app/admin/mail/broadcasts/[id]/page.tsx
// Edit a broadcast draft (or view a sent one). Permission: "mail.broadcast".
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/app/_staff/guard";
import { BroadcastEditor } from "@/components/admin/broadcasts/BroadcastEditor";

export const metadata: Metadata = { title: "Broadcast · Admin" };

export default async function AdminBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("admin", "mail/broadcasts", "mail.broadcast");
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  return <BroadcastEditor id={id} />;
}
