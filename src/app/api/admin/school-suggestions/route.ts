// GET /api/admin/school-suggestions
// The school suggestion queue. Permission: "manage_institution".
//
// status: one status, a comma-separated list, or "all" (default
// "pending,possible_duplicate"). sort: "priority" (default: most linked
// students first, then oldest) or "newest". page, limit (max 50). Each
// suggestion carries how many users a decision affects and, for possible
// duplicates, the existing university it resembles with a similarity score.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import {
  SUGGESTION_STATUSES,
  getSchoolSuggestionModel,
  type ISchoolSuggestion,
  type SuggestionStatus,
} from "@/lib/models/schoolSuggestionModel";
import { toAdminSuggestionDtos } from "@/lib/suggestionReview";
import type { AdminSuggestionsResponse } from "@/types/admin";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  priority: { adminPriority: -1, submittedAt: 1, _id: 1 },
  newest: { submittedAt: -1, _id: -1 },
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "manage_institution");
    const params = request.nextUrl.searchParams;

    const rawStatus = params.get("status") ?? "pending,possible_duplicate";
    const statuses = rawStatus === "all" ? null : rawStatus.split(",").map((s) => s.trim());
    if (statuses?.some((s) => !SUGGESTION_STATUSES.includes(s as SuggestionStatus))) {
      return fail(400, `status must be "all" or from: ${SUGGESTION_STATUSES.join(", ")}.`);
    }
    const sort = params.get("sort") ?? "priority";
    if (!SORTS[sort]) return fail(400, 'sort must be "priority" or "newest".');
    const { page, limit, skip } = pagination(params);

    const filter = statuses ? { status: { $in: statuses as SuggestionStatus[] } } : {};

    const Suggestion = await getSchoolSuggestionModel();
    const [docs, total, grouped] = await Promise.all([
      Suggestion.find(filter).sort(SORTS[sort]).skip(skip).limit(limit).lean<ISchoolSuggestion[]>(),
      Suggestion.countDocuments(filter),
      Suggestion.aggregate<{ _id: SuggestionStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts: Record<string, number> = Object.fromEntries(SUGGESTION_STATUSES.map((s) => [s, 0]));
    for (const g of grouped) counts[g._id] = g.count;

    const body: AdminSuggestionsResponse = {
      suggestions: await toAdminSuggestionDtos(docs),
      total,
      page,
      totalPages: totalPages(total, limit),
      counts,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/school-suggestions");
  }
}
