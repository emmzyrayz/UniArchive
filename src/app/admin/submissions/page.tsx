// app/admin/submissions/page.tsx
// The reviewer queue for UniLibrary submissions. The proxy only guarantees
// a session here; the permission check is below, and non-reviewers are sent
// back to their library.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { can } from "@/lib/auth/permissions";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import {
  REVIEWER_VISIBLE_STATUSES,
  type ReviewerVisibleStatus,
} from "@/lib/adminSubmissions";
import {
  SubmissionsReview,
  type UniversityOption,
} from "@/components/admin/SubmissionsReview";

export const metadata: Metadata = { title: "Submissions · UniArchive" };

export default async function AdminSubmissionsPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth?view=signin&from=%2Fadmin%2Fsubmissions");
  if (!can(session.role, "admin.view_submissions")) redirect("/home");

  const Submission = await getMaterialSubmissionModel();
  const [grouped, universities] = await Promise.all([
    Submission.aggregate<{ _id: ReviewerVisibleStatus; count: number }>([
      { $match: { status: { $in: REVIEWER_VISIBLE_STATUSES } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Only universities that actually have submissions, for the filter
    Submission.aggregate<{ _id: unknown; name: string; abbr?: string }>([
      {
        $match: {
          status: { $in: REVIEWER_VISIBLE_STATUSES },
          universityId: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$universityId",
          name: { $first: "$universityName" },
          abbr: { $first: "$universityAbbr" },
        },
      },
      { $sort: { name: 1 } },
    ]),
  ]);

  const counts = Object.fromEntries(REVIEWER_VISIBLE_STATUSES.map((s) => [s, 0])) as Record<
    ReviewerVisibleStatus,
    number
  >;
  for (const g of grouped) counts[g._id] = g.count;

  const universityOptions: UniversityOption[] = universities.map((u) => ({
    id: String(u._id),
    name: u.name ?? "Unknown university",
    abbr: u.abbr,
  }));

  return (
    <SubmissionsReview
      initialCounts={counts}
      universities={universityOptions}
      viewer={{
        userId: session.userId,
        upid: session.upid,
        canReview: can(session.role, "submission.review"),
        canVerifyTier1: can(session.role, "submission.verify_tier1"),
        canVerifyTier2: can(session.role, "submission.verify_tier2"),
        canReject: can(session.role, "submission.reject"),
      }}
    />
  );
}
