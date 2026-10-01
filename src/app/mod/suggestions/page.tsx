// app/mod/suggestions/page.tsx (shared page: src/app/_staff/SuggestionsPage.tsx)
import type { Metadata } from "next";
import { SuggestionsPage } from "@/app/_staff/SuggestionsPage";

export const metadata: Metadata = { title: "School Suggestions · Moderation" };

export default function Page() {
  return <SuggestionsPage area="mod" />;
}
