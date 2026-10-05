// app/admin/surveys/[id]/page.tsx
// Survey builder. Permission: "survey.manage".
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/app/_staff/guard";
import { SurveyBuilder } from "@/components/admin/surveys/SurveyBuilder";

export const metadata: Metadata = { title: "Survey · Admin" };

export default async function AdminSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("admin", "surveys", "survey.manage");
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  return <SurveyBuilder id={id} />;
}
