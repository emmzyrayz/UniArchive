// src/lib/auth/roleEligibility.ts
// Who may apply for the next role. Pure functions over the user's fields, so
// the eligibility API, the application route and the snapshot all agree.
//
//   student      -> collaborator: verified materials, account age, phone,
//                                 no violations
//   collaborator -> auditor:      verified materials, time as collaborator,
//                                 100% profile, no violations
//   everyone else: admin-assigned only
import type { UserRole } from "@/types/roles";
import type {
  ApplicableRole,
  EligibilityCondition,
  EligibilityResult,
} from "@/types/roleProgression";
import {
  AUDITOR_MATERIALS_REQUIRED,
  AUDITOR_MIN_MONTHS_AS_COLLABORATOR,
  COLLABORATOR_MATERIALS_REQUIRED,
  COLLABORATOR_MIN_ACCOUNT_AGE_DAYS,
} from "@/lib/constants/profile";

export type { EligibilityCondition, EligibilityResult };

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

/** The user fields eligibility reads, plus their profile completion. */
export interface EligibilityInput {
  role: UserRole;
  createdAt: Date | string;
  verifiedMaterialCount?: number;
  /** Ciphertext is fine; only its presence is checked */
  phone?: string;
  violationCount?: number;
  roleUpgradedAt?: Date | string;
  /** From calculateProfileCompletion, the same figure /api/auth/me shows */
  profileCompletionPercent: number;
}

export function accountAgeDays(user: Pick<EligibilityInput, "createdAt">, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(user.createdAt).getTime()) / DAY_MS));
}

/**
 * Whole months since becoming a collaborator. 0 if the promotion date is
 * unknown (e.g. the role was set by hand without roleUpgradedAt).
 */
export function monthsAsCollaborator(
  user: Pick<EligibilityInput, "role" | "roleUpgradedAt">,
  now = Date.now(),
): number {
  if (user.role !== "collaborator" || !user.roleUpgradedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(user.roleUpgradedAt).getTime()) / MONTH_MS));
}

function materialsCondition(count: number, required: number): EligibilityCondition {
  return {
    key: "verifiedMaterials",
    label: `${required} verified materials`,
    met: count >= required,
    current: count,
    required,
  };
}

function noViolationsCondition(violations: number): EligibilityCondition {
  return {
    key: "noViolations",
    label: "No active violations",
    met: violations === 0,
    current: violations,
    required: 0,
  };
}

function result(
  targetRole: ApplicableRole,
  conditions: EligibilityCondition[],
  materials: number,
  required: number,
): EligibilityResult {
  return {
    eligible: conditions.every((c) => c.met),
    targetRole,
    conditions,
    progressPercent: Math.round(Math.min(100, (materials / required) * 100)),
  };
}

export function checkCollaboratorEligibility(user: EligibilityInput): EligibilityResult {
  const materials = user.verifiedMaterialCount ?? 0;
  const age = accountAgeDays(user);
  const conditions: EligibilityCondition[] = [
    materialsCondition(materials, COLLABORATOR_MATERIALS_REQUIRED),
    {
      key: "accountAge",
      label: `Account at least ${COLLABORATOR_MIN_ACCOUNT_AGE_DAYS} days old`,
      met: age >= COLLABORATOR_MIN_ACCOUNT_AGE_DAYS,
      current: age,
      required: COLLABORATOR_MIN_ACCOUNT_AGE_DAYS,
    },
    {
      key: "hasPhone",
      label: "Phone number added",
      met: !!user.phone,
      current: !!user.phone,
      required: true,
    },
    noViolationsCondition(user.violationCount ?? 0),
  ];
  return result("collaborator", conditions, materials, COLLABORATOR_MATERIALS_REQUIRED);
}

export function checkAuditorEligibility(user: EligibilityInput): EligibilityResult {
  const materials = user.verifiedMaterialCount ?? 0;
  const months = monthsAsCollaborator(user);
  const conditions: EligibilityCondition[] = [
    materialsCondition(materials, AUDITOR_MATERIALS_REQUIRED),
    {
      key: "timeAsCollaborator",
      label: `${AUDITOR_MIN_MONTHS_AS_COLLABORATOR} months as Collaborator`,
      met: months >= AUDITOR_MIN_MONTHS_AS_COLLABORATOR,
      current: months,
      required: AUDITOR_MIN_MONTHS_AS_COLLABORATOR,
    },
    {
      key: "profileComplete",
      label: "100% profile completion",
      met: user.profileCompletionPercent >= 100,
      current: user.profileCompletionPercent,
      required: 100,
    },
    noViolationsCondition(user.violationCount ?? 0),
  ];
  return result("auditor", conditions, materials, AUDITOR_MATERIALS_REQUIRED);
}

/** The role a user can apply for next; null when only an admin can change it. */
export function getNextRole(currentRole: UserRole | string): ApplicableRole | null {
  if (currentRole === "student") return "collaborator";
  if (currentRole === "collaborator") return "auditor";
  return null;
}

export function checkEligibility(user: EligibilityInput): EligibilityResult | null {
  const nextRole = getNextRole(user.role);
  if (nextRole === "collaborator") return checkCollaboratorEligibility(user);
  if (nextRole === "auditor") return checkAuditorEligibility(user);
  return null;
}
