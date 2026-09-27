// GET /api/admin/counts
// Pending counts for every admin queue in one request, for the nav badges.
// Each count is only included when the caller can see that queue:
//   pendingSubmissions, pendingRoleApplications - "admin.view_submissions"
//   pendingSchoolSuggestions                    - institution admins
// A caller who can see none of them gets 403.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { getSchoolSuggestionModel } from "@/lib/models/schoolSuggestionModel";
import type { UserRole } from "@/types/roles";

// Same roles as /api/admin/suggestions/count
const SUGGESTION_REVIEWERS: UserRole[] = ["ed_admin", "com_admin", "webmaster", "dev"];

interface AdminCounts {
  pendingSubmissions?: number;
  pendingRoleApplications?: number;
  pendingSchoolSuggestions?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const seesQueues = can(session.role, "admin.view_submissions");
    const seesSuggestions = SUGGESTION_REVIEWERS.includes(session.role);
    if (!seesQueues && !seesSuggestions) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const [pendingSubmissions, pendingRoleApplications, pendingSchoolSuggestions] =
      await Promise.all([
        seesQueues
          ? getMaterialSubmissionModel().then((m) => m.countDocuments({ status: "submitted" }))
          : undefined,
        seesQueues
          ? getRoleApplicationModel().then((m) => m.countDocuments({ status: "pending" }))
          : undefined,
        seesSuggestions
          ? getSchoolSuggestionModel().then((m) =>
              m.countDocuments({ status: { $in: ["pending", "possible_duplicate"] } }),
            )
          : undefined,
      ]);

    const counts: AdminCounts = {
      pendingSubmissions,
      pendingRoleApplications,
      pendingSchoolSuggestions,
    };
    return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/counts");
  }
}
