// PATCH /api/admin/role-applications/[id]/reject
// Body: { reviewNote: string } - required, shown to the applicant
// Permission: user managers only (com_admin, webmaster, dev). The applicant
// can apply again once they've addressed the feedback (no cooldown yet).
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { loadSubmitterContact } from "@/lib/adminSubmissions";
import {
  APPLICABLE_ROLE_LABELS,
  canDecideRoleApplications,
  loadApplicantsNow,
  toAdminRoleApplicationDto,
} from "@/lib/roleApplications";
import { sendRoleApplicationRejectedEmail } from "@/utils/email";

type Context = { params: Promise<{ id: string }> };

const NOTE_MAX_LENGTH = 1000;

const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    if (!canDecideRoleApplications(session.role)) return fail(403, "Forbidden");
    await enforceRateLimit(request, "admin", `admin-role-applications:${session.userId}`);

    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Application not found.");

    const body = await readJson<{ reviewNote: string }>(request);
    const reviewNote = asTrimmedString(body?.reviewNote, NOTE_MAX_LENGTH);
    if (!reviewNote) return fail(400, "A note for the applicant is required.");

    const RoleApplication = await getRoleApplicationModel();
    const application = await RoleApplication.findById(id).select("applicantId status").lean();
    if (!application) return fail(404, "Application not found.");
    if (application.status !== "pending") {
      return fail(409, `This application is already ${application.status}.`);
    }
    if (String(application.applicantId) === session.userId) {
      return fail(403, "You can't decide your own application.");
    }

    const rejected = await RoleApplication.findOneAndUpdate(
      { _id: application._id, status: "pending" },
      {
        $set: {
          status: "rejected",
          reviewNote,
          reviewedBy: session.userId,
          reviewedByUpid: session.upid,
          reviewedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();
    if (!rejected) return fail(409, "This application changed. Reload and try again.");

    const contact = await loadSubmitterContact(rejected.applicantId);
    if (contact) {
      await sendRoleApplicationRejectedEmail({
        toEmail: contact.email,
        toName: contact.name,
        targetRole: APPLICABLE_ROLE_LABELS[rejected.targetRole],
        reviewNote,
      }).catch((error) => console.error("role reject: email failed:", error));
    }

    const applicantNow = await loadApplicantsNow([rejected.applicantId]);
    return NextResponse.json({
      success: true,
      application: toAdminRoleApplicationDto(rejected, applicantNow.get(String(rejected.applicantId))),
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/role-applications/[id]/reject");
  }
}
