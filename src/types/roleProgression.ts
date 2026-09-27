// types/roleProgression.ts
// Shapes shared by the role-progression API and the dashboard / admin UI.
import type { UserRole } from "@/types/roles";

export type ApplicableRole = "collaborator" | "auditor";
export type RoleApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface EligibilityCondition {
  key: string;
  label: string;
  met: boolean;
  current: number | string | boolean;
  required: number | string | boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  targetRole: ApplicableRole;
  conditions: EligibilityCondition[];
  /** 0-100, driven by verified materials (the slowest condition to meet) */
  progressPercent: number;
}

/** GET /api/user/eligibility */
export interface EligibilityResponse {
  currentRole: UserRole;
  /** null once the role is admin-managed (auditor and above, course reps...) */
  nextRole: ApplicableRole | null;
  eligible: boolean;
  conditions: EligibilityCondition[];
  progressPercent: number;
  message?: string;
}

export interface EligibilitySnapshotDto {
  verifiedMaterialCount: number;
  accountAgeDays: number;
  profileCompletionPercent: number;
  hasPhone: boolean;
  violationCount: number;
  monthsAsCollaborator?: number;
  currentRole: string;
  checkedAt: string;
}

/** An application as its applicant sees it. */
export interface RoleApplicationDto {
  id: string;
  currentRole: string;
  targetRole: ApplicableRole;
  status: RoleApplicationStatus;
  supportingNote?: string;
  appliedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  autoWithdrawnReason?: string;
}

/** An application as a reviewer sees it. */
export interface AdminRoleApplicationDto extends RoleApplicationDto {
  applicant: {
    id: string;
    upid: string;
    name: string;
    /** Their role now, which may differ from currentRole at application */
    roleNow?: string;
    verifiedMaterialCountNow?: number;
  };
  eligibilitySnapshot: EligibilitySnapshotDto;
  reviewedByUpid?: string;
}
