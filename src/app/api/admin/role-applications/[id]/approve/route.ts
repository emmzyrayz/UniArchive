// PATCH /api/admin/role-applications/[id]/approve
// Promotes the applicant to the role they applied for. Permission: user
// managers only (com_admin, webmaster, dev).
//
// Bumping tokenVersion signs the applicant out everywhere
// (src/lib/auth/session.ts); they sign in again with the new role.
//
// If the applicant's role changed some other way while the application
// waited, it's closed as withdrawn instead of overwriting that change.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getUserModel } from "@/lib/models/userModel";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { loadSubmitterContact } from "@/lib/adminSubmissions";
import {
  APPLICABLE_ROLE_LABELS,
  canDecideRoleApplications,
  loadApplicantsNow,
  toAdminRoleApplicationDto,
} from "@/lib/roleApplications";
import { sendRoleApplicationApprovedEmail } from "@/utils/email";
import type { UserRole } from "@/types/roles";

type Context = { params: Promise<{ id: string }> };

const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    if (!canDecideRoleApplications(session.role)) return fail(403, "Forbidden");
    enforceRateLimit(request, `admin-role-applications:${session.userId}`, 60);

    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Application not found.");

    const RoleApplication = await getRoleApplicationModel();
    const application = await RoleApplication.findById(id).lean();
    if (!application) return fail(404, "Application not found.");
    if (application.status !== "pending") {
      return fail(409, `This application is already ${application.status}.`);
    }
    if (String(application.applicantId) === session.userId) {
      return fail(403, "You can't decide your own application.");
    }

    // Claim the decision first so a concurrent approve/reject can't also win
    const now = new Date();
    const approved = await RoleApplication.findOneAndUpdate(
      { _id: application._id, status: "pending" },
      {
        $set: {
          status: "approved",
          reviewedBy: session.userId,
          reviewedByUpid: session.upid,
          reviewedAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    if (!approved) return fail(409, "This application changed. Reload and try again.");

    // Only from the role they applied with, so a promotion or demotion made
    // elsewhere in the meantime is never overwritten
    const User = await getUserModel();
    const promoted = await User.updateOne(
      { _id: approved.applicantId, role: approved.currentRole as UserRole },
      {
        $set: {
          role: approved.targetRole,
          previousRole: approved.currentRole,
          roleUpgradedAt: now,
        },
        $inc: { tokenVersion: 1 },
      },
    );

    if (promoted.matchedCount === 0) {
      const current = await User.findById(approved.applicantId).select("role").lean();
      const reason = current
        ? `The applicant's role changed to ${current.role} before this was reviewed.`
        : "The applicant's account no longer exists.";
      await RoleApplication.updateOne(
        { _id: approved._id },
        { $set: { status: "withdrawn", autoWithdrawnReason: reason } },
      );
      return fail(409, `${reason} The application was withdrawn.`);
    }

    const contact = await loadSubmitterContact(approved.applicantId);
    if (contact) {
      await sendRoleApplicationApprovedEmail({
        toEmail: contact.email,
        toName: contact.name,
        newRole: APPLICABLE_ROLE_LABELS[approved.targetRole],
      }).catch((error) => console.error("role approve: email failed:", error));
    }

    const applicantNow = await loadApplicantsNow([approved.applicantId]);
    return NextResponse.json({
      success: true,
      application: toAdminRoleApplicationDto(approved, applicantNow.get(String(approved.applicantId))),
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/role-applications/[id]/approve");
  }
}
