// PATCH /api/admin/submissions/[id]/reject
// submitted | in_review -> rejected. Body: { reason: string, note?: string }.
// The reason is shown to (and emailed to) the submitter; the note is an
// internal review note. The Book keeps its submission, so the submitter can
// edit and resubmit via PATCH /api/submissions/[id].
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { removeUnverifiedMaterial } from "@/lib/materialPublish";
import {
  DECIDABLE_STATUSES,
  adminSubmissionResponse,
  loadReviewableSubmission,
  loadSubmitterContact,
  parseText,
  reviewNote,
} from "@/lib/adminSubmissions";
import { sendSubmissionRejectedEmail } from "@/utils/email";
import { notifyAfter } from "@/lib/notifications";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "submission.reject");
    await enforceRateLimit(request, "admin", `admin-submissions:${session.userId}`);
    const { id } = await context.params;

    const body = await readJson<{ reason: string; note: string }>(request);
    const reason = parseText(body?.reason, "reason", { required: true })!;
    const note = parseText(body?.note, "note");

    const submission = await loadReviewableSubmission(id);
    if (!DECIDABLE_STATUSES.includes(submission.status)) {
      return NextResponse.json(
        { message: `This submission is already ${submission.status.replace("_", " ")}.` },
        { status: 409 },
      );
    }

    const now = new Date();
    const Submission = await getMaterialSubmissionModel();
    const rejected = await Submission.findOneAndUpdate(
      { _id: submission._id, status: { $in: DECIDABLE_STATUSES } },
      {
        $set: {
          status: "rejected",
          rejectionReason: reason,
          reviewedBy: session.userId,
          reviewedAt: now,
        },
        ...(note ? { $push: { reviewNotes: reviewNote(session, note) } } : {}),
      },
      { returnDocument: "after" },
    ).lean();
    if (!rejected) {
      return NextResponse.json(
        { message: "This submission changed status. Reload and try again." },
        { status: 409 },
      );
    }
    // It leaves the UniLibrary, where it was listed as unverified
    await removeUnverifiedMaterial(rejected.bookId);
    notifyAfter(rejected.submittedBy, {
      type: "submission_rejected",
      title: "Your submission wasn't accepted",
      body: `"${rejected.title}": ${reason}`,
      link: "/upload",
      dedupeKey: `submission-rejected:${String(rejected._id)}`,
    });

    const contact = await loadSubmitterContact(rejected.submittedBy);
    if (contact) {
      await sendSubmissionRejectedEmail({
        toEmail: contact.email,
        toName: contact.name,
        materialTitle: rejected.title,
        reason,
      }).catch((error) => console.error("reject: email failed:", error));
    }

    return NextResponse.json({
      success: true,
      submission: await adminSubmissionResponse(rejected),
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/submissions/[id]/reject");
  }
}
