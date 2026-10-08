// app/scouts/play/page.tsx
// One Archive Scouts task at a time: /scouts/play?task=identify|readable|check_typed.
import { redirect } from "next/navigation";
import { createMetadata } from "@/lib/seo";
import { SCOUT_TASK_IDS, type ScoutTask } from "@/lib/scouts/taskTypes";
import { ScoutPlay } from "@/components/scouts/ScoutPlay";

export const metadata = createMetadata({
  title: "Scout tasks",
  description: "Archive Scouts tasks.",
  path: "/scouts/play",
  noIndex: true,
});

export default async function ScoutPlayPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task } = await searchParams;
  if (!SCOUT_TASK_IDS.includes(task as ScoutTask)) redirect("/scouts");
  return <ScoutPlay key={task} task={task as ScoutTask} />;
}
