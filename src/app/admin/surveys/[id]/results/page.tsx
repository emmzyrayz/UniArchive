// app/admin/surveys/[id]/results/page.tsx
// Survey results and responses. Permission: "survey.manage".
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/app/_staff/guard";
import { SurveyResults } from "@/components/admin/surveys/SurveyResults";

export const metadata: Metadata = { title: "Survey results · Admin" };

export default async function AdminSurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("admin", "surveys", "survey.manage");
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  return <SurveyResults id={id} />;
}
