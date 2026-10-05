// app/admin/surveys/page.tsx
// Surveys list. Permission: "survey.manage" (com_admin, dev).
import type { Metadata } from "next";
import { requireStaffPage } from "@/app/_staff/guard";
import { SurveysAdmin } from "@/components/admin/surveys/SurveysAdmin";

export const metadata: Metadata = { title: "Surveys · Admin" };

export default async function AdminSurveysPage() {
  await requireStaffPage("admin", "surveys", "survey.manage");
  return <SurveysAdmin />;
}
