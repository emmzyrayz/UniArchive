// GET /api/admin/submissions
// The reviewer queue. Filters: status (default "submitted", or "all"),
// category, universityId, page, limit (max 50), sort ("oldest" = FIFO, the
// default, or "newest"). Every response carries per-status counts (with the
// category/university filters applied) so the tabs need no extra request.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { isMaterialCategory } from "@/lib/constants/materialCategories";
import {
  REVIEWER_VISIBLE_STATUSES,
  loadUserSummaries,
  loadVerificationTiers,
  toAdminSubmissionDto,
  type ReviewerVisibleStatus,
} from "@/lib/adminSubmissions";

const MAX_LIMIT = 50;

const badRequest = (message: string) => NextResponse.json({ message }, { status: 400 });

function positiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "admin.view_submissions");
    const params = request.nextUrl.searchParams;

    const status = params.get("status") ?? "submitted";
    if (status !== "all" && !REVIEWER_VISIBLE_STATUSES.includes(status as ReviewerVisibleStatus)) {
      return badRequest(`status must be one of: ${REVIEWER_VISIBLE_STATUSES.join(", ")}, all.`);
    }
    const category = params.get("category");
    if (category && !isMaterialCategory(category)) return badRequest("Unknown category.");
    const universityId = params.get("universityId");
    if (universityId && !isValidObjectId(universityId)) {
      return badRequest("universityId is not a valid id.");
    }
    const sort = params.get("sort") ?? "oldest";
    if (sort !== "oldest" && sort !== "newest") {
      return badRequest('sort must be "oldest" or "newest".');
    }
    const page = positiveInt(params.get("page"), 1);
    const limit = Math.min(positiveInt(params.get("limit"), 20), MAX_LIMIT);

    // Filters shared by the list and the tab counts
    const base: Record<string, unknown> = {};
    if (category) base.category = category;
    if (universityId) base.universityId = new Types.ObjectId(universityId);

    const listFilter: Record<string, unknown> = {
      ...base,
      status: status === "all" ? { $in: REVIEWER_VISIBLE_STATUSES } : status,
    };
    const direction = sort === "oldest" ? 1 : -1;

    const Submission = await getMaterialSubmissionModel();
    const [docs, total, grouped] = await Promise.all([
      Submission.find(listFilter)
        .sort({ submittedAt: direction, _id: direction })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Submission.countDocuments(listFilter),
      Submission.aggregate<{ _id: ReviewerVisibleStatus; count: number }>([
        { $match: { ...base, status: { $in: REVIEWER_VISIBLE_STATUSES } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = Object.fromEntries(REVIEWER_VISIBLE_STATUSES.map((s) => [s, 0])) as Record<
      ReviewerVisibleStatus,
      number
    >;
    for (const g of grouped) counts[g._id] = g.count;

    const [users, tiers] = await Promise.all([
      loadUserSummaries(docs),
      loadVerificationTiers(docs),
    ]);
    return NextResponse.json(
      {
        submissions: docs.map((d) => toAdminSubmissionDto(d, users, tiers)),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        counts,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/submissions");
  }
}
