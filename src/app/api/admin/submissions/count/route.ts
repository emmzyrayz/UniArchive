// GET /api/admin/submissions/count
// Number of submissions waiting for a reviewer, for the nav badge.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "admin.view_submissions");

    const Submission = await getMaterialSubmissionModel();
    const pendingCount = await Submission.countDocuments({ status: "submitted" });

    return NextResponse.json({ pendingCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "admin/submissions/count");
  }
}
