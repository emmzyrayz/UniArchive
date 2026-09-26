// PATCH /api/admin/submissions/[id]/start-review
// submitted -> in_review, claimed by the caller. Idempotent for the reviewer
// who already holds it; 409 if someone else does. Body: { note?: string }.
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
import { getUserModel } from "@/lib/models/userModel";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "submission.review");
    enforceRateLimit(request, `admin-submissions:${session.userId}`, 60);
    const { id } = await context.params;
    const current = await loadReviewableSubmission(id);

    const body = await readJson<{ note: string }>(request);
    const note = parseText(body?.note, "note");
    const push = note ? { $push: { reviewNotes: reviewNote(session, note) } } : {};

    const Submission = await getMaterialSubmissionModel();
    // Conditional on the status so two reviewers can't both claim it
    const claimed = await Submission.findOneAndUpdate(
      { _id: current._id, status: "submitted" },
      {
        $set: { status: "in_review", reviewStartedAt: new Date(), reviewedBy: session.userId },
        ...push,
      },
      { returnDocument: "after" },
    ).lean();
    if (claimed) {
      return NextResponse.json({ submission: await adminSubmissionResponse(claimed) });
    }

    // Lost the race or it wasn't "submitted": re-read to explain why
    const latest = await loadReviewableSubmission(id);
    if (latest.status === "in_review") {
      if (latest.reviewedBy?.toString() === session.userId) {
        const updated = note
          ? await Submission.findByIdAndUpdate(latest._id, push, { returnDocument: "after" }).lean()
          : latest;
        return NextResponse.json({ submission: await adminSubmissionResponse(updated ?? latest) });
      }
      const User = await getUserModel();
      const reviewer = latest.reviewedBy
        ? await User.findById(latest.reviewedBy).select("upid").lean()
        : null;
      return NextResponse.json(
        {
          message: `This submission is already being reviewed by ${reviewer?.upid ?? "another reviewer"}.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: `This submission is already ${latest.status.replace("_", " ")}.` },
      { status: 409 },
    );
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/submissions/[id]/start-review");
  }
}
