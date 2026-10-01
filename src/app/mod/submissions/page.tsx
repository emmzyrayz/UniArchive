// app/mod/submissions/page.tsx (shared page: src/app/_staff/SubmissionsPage.tsx)
import type { Metadata } from "next";
import { SubmissionsPage } from "@/app/_staff/SubmissionsPage";

export const metadata: Metadata = { title: "Submissions · Moderation" };

export default function Page() {
  return <SubmissionsPage area="mod" />;
}
