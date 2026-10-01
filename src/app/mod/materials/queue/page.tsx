// app/mod/materials/queue/page.tsx (shared page: src/app/_staff/QueuePage.tsx)
import type { Metadata } from "next";
import { QueuePage } from "@/app/_staff/QueuePage";

export const metadata: Metadata = { title: "Upload Queue · Moderation" };

export default function Page() {
  return <QueuePage area="mod" />;
}
