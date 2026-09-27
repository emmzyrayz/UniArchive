// src/lib/roleApplications.ts
// Server helpers for role progression: loading a user's eligibility (with the
// same profile completion /api/auth/me reports), freezing it into an
// application snapshot, and turning applications into client DTOs.
import type { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { can } from "@/lib/auth/permissions";
import type {
  IEligibilitySnapshot,
  IRoleApplication,
} from "@/lib/models/roleApplicationModel";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { loadPendingSuggestionForCompletion } from "@/lib/schoolSuggestions";
import {
  accountAgeDays,
  checkEligibility,
  monthsAsCollaborator,
  type EligibilityInput,
} from "@/lib/auth/roleEligibility";
import type {
  AdminRoleApplicationDto,
  ApplicableRole,
  EligibilityResult,
  RoleApplicationDto,
} from "@/types/roleProgression";
import type { UserRole } from "@/types/roles";

export const APPLICABLE_ROLE_LABELS: Record<ApplicableRole, string> = {
  collaborator: "Collaborator",
  auditor: "Auditor",
};

// Everything calculateProfileCompletion and the eligibility checks read
const ELIGIBILITY_FIELDS =
  "role createdAt verifiedMaterialCount phone violationCount roleUpgradedAt upid fullName " +
  "isVerified profilePhoto username bio dob universityId facultyId departmentId level " +
  "pendingSuggestionId";

export interface LoadedEligibility {
  userId: string;
  upid: string;
  fullName: string;
  role: UserRole;
  input: EligibilityInput;
  /** null when the role is admin-managed */
  result: EligibilityResult | null;
}

/** The user's eligibility for their next role, or null if they don't exist. */
export async function loadEligibility(userId: string): Promise<LoadedEligibility | null> {
  const User = await getUserModel();
  const user = await User.findById(userId).select(ELIGIBILITY_FIELDS).lean();
  if (!user) return null;

  const pendingSuggestion = await loadPendingSuggestionForCompletion(user.pendingSuggestionId);
  const completion = calculateProfileCompletion(user, pendingSuggestion);
  const input: EligibilityInput = {
    role: user.role,
    createdAt: user.createdAt,
    verifiedMaterialCount: user.verifiedMaterialCount,
    phone: user.phone,
    violationCount: user.violationCount,
    roleUpgradedAt: user.roleUpgradedAt,
    profileCompletionPercent: completion.percentage,
  };
  return {
    userId: String(user._id),
    upid: user.upid,
    fullName: user.fullName,
    role: user.role,
    input,
    result: checkEligibility(input),
  };
}

export function buildSnapshot(input: EligibilityInput): IEligibilitySnapshot {
  return {
    verifiedMaterialCount: input.verifiedMaterialCount ?? 0,
    accountAgeDays: accountAgeDays(input),
    profileCompletionPercent: input.profileCompletionPercent,
    hasPhone: !!input.phone,
    violationCount: input.violationCount ?? 0,
    ...(input.role === "collaborator" ? { monthsAsCollaborator: monthsAsCollaborator(input) } : {}),
    currentRole: input.role,
    checkedAt: new Date(),
  };
}

type ApplicationDoc = Pick<
  IRoleApplication,
  | "_id"
  | "applicantId"
  | "applicantUpid"
  | "applicantName"
  | "currentRole"
  | "targetRole"
  | "status"
  | "supportingNote"
  | "appliedAt"
  | "reviewedAt"
  | "reviewedByUpid"
  | "reviewNote"
  | "autoWithdrawnReason"
  | "eligibilitySnapshot"
>;

const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

export function toRoleApplicationDto(doc: ApplicationDoc): RoleApplicationDto {
  return {
    id: String(doc._id),
    currentRole: doc.currentRole,
    targetRole: doc.targetRole,
    status: doc.status,
    supportingNote: doc.supportingNote,
    appliedAt: iso(doc.appliedAt)!,
    reviewedAt: iso(doc.reviewedAt),
    reviewNote: doc.reviewNote,
    autoWithdrawnReason: doc.autoWithdrawnReason,
  };
}

export function toAdminRoleApplicationDto(
  doc: ApplicationDoc,
  now?: { role: string; verifiedMaterialCount?: number },
): AdminRoleApplicationDto {
  const snap = doc.eligibilitySnapshot;
  return {
    ...toRoleApplicationDto(doc),
    applicant: {
      id: String(doc.applicantId),
      upid: doc.applicantUpid,
      name: doc.applicantName,
      roleNow: now?.role,
      verifiedMaterialCountNow: now?.verifiedMaterialCount,
    },
    eligibilitySnapshot: {
      verifiedMaterialCount: snap.verifiedMaterialCount,
      accountAgeDays: snap.accountAgeDays,
      profileCompletionPercent: snap.profileCompletionPercent,
      hasPhone: snap.hasPhone,
      violationCount: snap.violationCount ?? 0,
      monthsAsCollaborator: snap.monthsAsCollaborator,
      currentRole: snap.currentRole,
      checkedAt: iso(snap.checkedAt)!,
    },
    reviewedByUpid: doc.reviewedByUpid,
  };
}

/** Current role and verified count for each applicant, keyed by user id. */
export async function loadApplicantsNow(
  ids: Types.ObjectId[],
): Promise<Map<string, { role: string; verifiedMaterialCount?: number }>> {
  if (ids.length === 0) return new Map();
  const User = await getUserModel();
  const users = await User.find({ _id: { $in: ids } })
    .select("role verifiedMaterialCount")
    .lean();
  return new Map(
    users.map((u) => [String(u._id), { role: u.role, verifiedMaterialCount: u.verifiedMaterialCount }]),
  );
}

/**
 * Who may approve or reject applications: user managers (com_admin,
 * webmaster, dev). ed_admin governs institutions, not users. Anyone with
 * "admin.view_submissions" can see the queue.
 */
export function canDecideRoleApplications(role: UserRole): boolean {
  return can(role, "manage_users");
}
