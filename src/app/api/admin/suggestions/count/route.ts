// GET /api/admin/suggestions/count
// Number of school suggestions awaiting review, for the admin badge.
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getSchoolSuggestionModel } from "@/lib/models/schoolSuggestionModel";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ed_admin", "com_admin", "webmaster", "dev"]);

    const Suggestion = await getSchoolSuggestionModel();
    const pendingCount = await Suggestion.countDocuments({
      status: { $in: ["pending", "possible_duplicate"] },
    });

    return NextResponse.json({ pendingCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "admin/suggestions/count");
  }
}
