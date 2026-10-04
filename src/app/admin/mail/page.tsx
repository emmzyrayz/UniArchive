// app/admin/mail/page.tsx
// Write to one user (ZeptoMail). Permission: "mail.send_user" (com_admin,
// webmaster, dev). Admin-only: there's no /mod copy.
import type { Metadata } from "next";
import { requireStaffPage } from "@/app/_staff/guard";
import { MailAdmin } from "@/components/admin/MailAdmin";

export const metadata: Metadata = { title: "Mail · Admin" };

const UPID_PATTERN = /^[a-z0-9]{1,60}$/i;

export default async function AdminMailPage({ searchParams }: { searchParams: Promise<{ to?: string | string[] }> }) {
  const session = await requireStaffPage("admin", "mail", "mail.send_user");
  const { to } = await searchParams;
  const upid = typeof to === "string" && UPID_PATTERN.test(to) ? to : undefined;
  return <MailAdmin senderName={session.fullName} initialUpid={upid} />;
}
