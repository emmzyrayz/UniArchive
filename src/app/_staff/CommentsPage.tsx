// app/_staff/CommentsPage.tsx
// The reported comments queue, in /admin and /mod (reviewers).
import type { StaffArea } from "@/lib/routeAccess";
import { CommentsAdmin } from "@/components/admin/CommentsAdmin";
import { requireStaffPage } from "./guard";

export async function CommentsPage({ area }: { area: StaffArea }) {
  await requireStaffPage(area, "comments", "admin.view_submissions");
  return <CommentsAdmin />;
}
