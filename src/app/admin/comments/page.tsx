// app/admin/comments/page.tsx
// The reported comments queue. Open to reviewers ("admin.view_submissions");
// the proxy only guarantees a session here.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { CommentsAdmin } from "@/components/admin/CommentsAdmin";

export const metadata: Metadata = { title: "Reported Comments · Admin · UniArchive" };

export default async function AdminCommentsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Fcomments");
  if (!can(session.role, "admin.view_submissions")) redirect("/home");
  return <CommentsAdmin />;
}
