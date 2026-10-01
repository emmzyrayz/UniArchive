// GET /api/admin/counts
// Every admin queue count and the headline platform stats in one request,
// for the /admin dashboard cards and the nav badges.
// Permission: "admin.view_submissions".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { getSchoolSuggestionModel } from "@/lib/models/schoolSuggestionModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getUserModel } from "@/lib/models/userModel";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getCommentModel } from "@/lib/models/commentModel";
import type { AdminCounts } from "@/types/admin";
import { getBookModel } from "@/lib/models/bookModel";
import { queueFilter } from "@/lib/platformUploads";
import { can } from "@/lib/auth/permissions";
import { isAdminRole } from "@/types/roles";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(request, "admin.view_submissions");
    const uploadsFilter = queueFilter(session, isAdminRole(session.role) ? "all" : "mine", "pending");
    const giftsFilter = queueFilter(session, "gifts", "pending");

    const [Submission, RoleApplication, Suggestion, Material, User, University, Comment] =
      await Promise.all([
        getMaterialSubmissionModel(),
        getRoleApplicationModel(),
        getSchoolSuggestionModel(),
        getMaterialModel(),
        getUserModel(),
        getUniversityModel(),
        getCommentModel(),
      ]);

    const [
      pendingSubmissions,
      inReviewSubmissions,
      pendingRoleApplications,
      pendingSchoolSuggestions,
      possibleDuplicates,
      totalMaterials,
      totalUsers,
      newUsersThisWeek,
      totalInstitutions,
      reportedComments,
      pendingPlatformUploads,
      pendingGifts,
    ] = await Promise.all([
      Submission.countDocuments({ status: "submitted" }),
      Submission.countDocuments({ status: "in_review" }),
      RoleApplication.countDocuments({ status: "pending" }),
      Suggestion.countDocuments({ status: "pending" }),
      Suggestion.countDocuments({ status: "possible_duplicate" }),
      Material.countDocuments({ isActive: true }),
      User.estimatedDocumentCount(),
      User.countDocuments({ createdAt: { $gt: new Date(Date.now() - WEEK_MS) } }),
      University.countDocuments({ isActive: true }),
      Comment.countDocuments({ isReported: true }),
      uploadsFilter && can(session.role, "material.ingest")
        ? (await getBookModel()).countDocuments(uploadsFilter)
        : Promise.resolve(0),
      giftsFilter ? (await getBookModel()).countDocuments(giftsFilter) : Promise.resolve(null),
    ]);

    const counts: AdminCounts = {
      pendingSubmissions,
      inReviewSubmissions,
      pendingRoleApplications,
      pendingSchoolSuggestions,
      possibleDuplicates,
      totalMaterials,
      totalUsers,
      newUsersThisWeek,
      totalInstitutions,
      reportedComments,
      pendingPlatformUploads,
      pendingGifts,
    };
    return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/counts");
  }
}
