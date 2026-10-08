// app/scouts/page.tsx
// Archive Scouts home (signed in): wallet, tasks, latest credits.
import { createMetadata } from "@/lib/seo";
import { ScoutsHub } from "@/components/scouts/ScoutsHub";

export const metadata = createMetadata({
  title: "Archive Scouts",
  description: "Small tasks that keep the UniLibrary accurate, rewarded with Archive Credits and XP.",
  path: "/scouts",
  noIndex: true,
});

export default function ScoutsPage() {
  return <ScoutsHub />;
}
