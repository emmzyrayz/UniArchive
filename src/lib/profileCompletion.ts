// src/lib/profileCompletion.ts
// Calculates profile completion % and the missing fields. Called server-side
// in /api/auth/me so every authenticated page has the percentage without an
// extra fetch.
import type { Types } from "mongoose";
import type { IUser } from "@/lib/models/userModel";
import type { SuggestionScope } from "@/lib/models/schoolSuggestionModel";

/** Just the fields the calculation reads, so a .lean() result works too. */
export type ProfileCompletionInput = Pick<
  IUser,
  | "isVerified"
  | "phone"
  | "profilePhoto"
  | "fullName"
  | "username"
  | "bio"
  | "dob"
  | "universityId"
  | "facultyId"
  | "departmentId"
  | "level"
>;

/**
 * The user's open school suggestion, if any. Only pass one whose status is
 * still active (awaiting review); a rejected or withdrawn one earns nothing.
 */
export interface PendingSuggestionInput {
  suggestionScope: SuggestionScope;
  existingUniversityId?: Types.ObjectId;
  existingFacultyId?: Types.ObjectId;
}

export interface CompletionCheck {
  key: string;
  label: string;
  weight: number;
  met: boolean;
  category: "account" | "personal" | "academic";
}

export interface ProfileCompletion {
  percentage: number;
  checks: CompletionCheck[];
  missing: string[];
  canSubmitMaterials: boolean; // true only at 100%
  canApplyForCollaborator: boolean; // needs phone + university set
}

export function calculateProfileCompletion(
  user: ProfileCompletionInput,
  pendingSuggestion?: PendingSuggestionInput | null,
): ProfileCompletion {
  // Partial credit while a school suggestion awaits review: any suggestion
  // means the university is known; a department-only suggestion means the
  // faculty exists too. The department only counts once it's approved.
  const universityMet = !!user.universityId || !!pendingSuggestion;
  const facultyMet =
    !!user.facultyId || pendingSuggestion?.suggestionScope === "department_only";
  const departmentMet = !!user.departmentId;

  // Weights sum to 100.
  const checks: CompletionCheck[] = [
    // Account (30%)
    {
      key: "emailVerified",
      label: "Verify your email",
      weight: 15,
      met: !!user.isVerified,
      category: "account",
    },
    {
      key: "phoneAdded",
      label: "Add your phone number",
      weight: 10,
      met: !!user.phone,
      category: "account",
    },
    {
      key: "photoUploaded",
      label: "Upload a profile photo",
      weight: 5,
      met: !!user.profilePhoto,
      category: "account",
    },

    // Personal (30%)
    {
      key: "fullName",
      label: "Add your full name",
      weight: 10,
      met: !!user.fullName?.trim(),
      category: "personal",
    },
    {
      key: "username",
      label: "Choose a username",
      weight: 10,
      met: !!user.username?.trim(),
      category: "personal",
    },
    {
      key: "bioAdded",
      label: "Write a short bio",
      weight: 5,
      met: !!user.bio?.trim(),
      category: "personal",
    },
    {
      key: "dobAdded",
      label: "Add your date of birth",
      weight: 5,
      met: !!user.dob,
      category: "personal",
    },

    // Academic (40%)
    {
      key: "universitySet",
      label: "Select your university",
      weight: 15,
      met: universityMet,
      category: "academic",
    },
    {
      key: "facultySet",
      label: "Select your faculty",
      weight: 10,
      met: facultyMet,
      category: "academic",
    },
    {
      key: "departmentSet",
      label: "Select your department",
      weight: 10,
      met: departmentMet,
      category: "academic",
    },
    {
      key: "levelSet",
      label: "Select your level",
      weight: 5,
      met: !!user.level?.trim(),
      category: "academic",
    },
  ];

  const percentage = checks
    .filter((c) => c.met)
    .reduce((sum, c) => sum + c.weight, 0);

  const missing = checks.filter((c) => !c.met).map((c) => c.key);

  return {
    percentage,
    checks,
    missing,
    canSubmitMaterials: percentage === 100,
    canApplyForCollaborator: !!user.phone && !!user.universityId,
  };
}
