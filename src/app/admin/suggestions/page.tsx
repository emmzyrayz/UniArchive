// app/admin/suggestions/page.tsx
// Students' school suggestions.
// Permission: "manage_institution" (ed_admin, com_admin, webmaster, dev).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { SuggestionsAdmin } from "@/components/admin/SuggestionsAdmin";

export const metadata: Metadata = { title: "School Suggestions · Admin · UniArchive" };

export default async function AdminSuggestionsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Fsuggestions");
  if (!can(session.role, "manage_institution")) redirect("/admin");

  return <SuggestionsAdmin />;
}
