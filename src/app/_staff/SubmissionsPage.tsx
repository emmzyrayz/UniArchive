// app/_staff/SubmissionsPage.tsx
// The reviewer queue for UniLibrary submissions, in /admin and /mod.
import { can } from "@/lib/auth/permissions";
import type { StaffArea } from "@/lib/routeAccess";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import {
  REVIEWER_VISIBLE_STATUSES,
  type ReviewerVisibleStatus,
} from "@/lib/adminSubmissions";
import {
  SubmissionsReview,
  type UniversityOption,
} from "@/components/admin/SubmissionsReview";
import { requireStaffPage } from "./guard";

export async function SubmissionsPage({ area }: { area: StaffArea }) {
  const session = await requireStaffPage(area, "submissions", "admin.view_submissions");

  const Submission = await getMaterialSubmissionModel();
  const [grouped, universities] = await Promise.all([
    Submission.aggregate<{ _id: ReviewerVisibleStatus; count: number }>([
      { $match: { status: { $in: REVIEWER_VISIBLE_STATUSES }, source: { $ne: "platform" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Only universities that actually have submissions, for the filter
    Submission.aggregate<{ _id: unknown; name: string; abbr?: string }>([
      {
        $match: {
          status: { $in: REVIEWER_VISIBLE_STATUSES },
          source: { $ne: "platform" },
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
