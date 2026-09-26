// POST /api/admin/submissions/[id]/note
// Adds a review note without changing the status. Body: { note: string }.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import {
  adminSubmissionResponse,
  loadReviewableSubmission,
  parseText,
  reviewNote,
} from "@/lib/adminSubmissions";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "admin.view_submissions");
    enforceRateLimit(request, `admin-submissions:${session.userId}`, 60);
    const { id } = await context.params;

    const body = await readJson<{ note: string }>(request);
    const note = parseText(body?.note, "note", { required: true })!;
    const submission = await loadReviewableSubmission(id);

    const Submission = await getMaterialSubmissionModel();
    const updated = await Submission.findByIdAndUpdate(
      submission._id,
      { $push: { reviewNotes: reviewNote(session, note) } },
      { returnDocument: "after" },
    ).lean();
    if (!updated) {
      return NextResponse.json({ message: "Submission not found." }, { status: 404 });
    }

    const dto = await adminSubmissionResponse(updated);
    return NextResponse.json({ reviewNotes: dto.reviewNotes, submission: dto });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/submissions/[id]/note");
  }
}
