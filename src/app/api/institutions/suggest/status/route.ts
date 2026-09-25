// GET /api/institutions/suggest/status
// The caller's school suggestion that's still awaiting review, or null.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getUserModel } from "@/lib/models/userModel";
import {
  ACTIVE_SUGGESTION_STATUSES,
  getSchoolSuggestionModel,
} from "@/lib/models/schoolSuggestionModel";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const User = await getUserModel();
    const user = await User.findById(session.userId).select("pendingSuggestionId").lean();
    if (!user?.pendingSuggestionId) {
      return NextResponse.json({ suggestion: null }, { headers: { "Cache-Control": "no-store" } });
    }

    const Suggestion = await getSchoolSuggestionModel();
    const suggestion = await Suggestion.findOne({
      _id: user.pendingSuggestionId,
      submittedBy: session.userId,
      status: { $in: ACTIVE_SUGGESTION_STATUSES },
    })
      .select(
        "status suggestedUniversityName suggestedFacultyName suggestedDepartmentName " +
          "submittedAt canWithdrawUntil suggestionScope adminPriority linkedToSuggestionId",
      )
      .lean();

    return NextResponse.json(
      {
        suggestion: suggestion
          ? {
              ...suggestion,
              _id: suggestion._id.toString(),
              linkedToSuggestionId: suggestion.linkedToSuggestionId?.toString(),
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "institutions/suggest/status");
  }
}
