// app/mod/comments/page.tsx (shared page: src/app/_staff/CommentsPage.tsx)
import type { Metadata } from "next";
import { CommentsPage } from "@/app/_staff/CommentsPage";

export const metadata: Metadata = { title: "Reported Comments · Moderation" };

export default function Page() {
  return <CommentsPage area="mod" />;
}
