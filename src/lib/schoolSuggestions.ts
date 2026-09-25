// src/lib/schoolSuggestions.ts
// Duplicate detection and helpers for school suggestions.
//
// classifySuggestion() only reads; the route decides what to write. Keeping
// detection read-only lets it be exercised against real data safely.
import type { Types } from "mongoose";
import { CERTAIN_MATCH, findSimilar } from "@/lib/fuzzyMatch";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";
import {
  ACTIVE_SUGGESTION_STATUSES,
  getSchoolSuggestionModel,
  type SuggestionScope,
  type SuggestionStatus,
} from "@/lib/models/schoolSuggestionModel";
import type { PendingSuggestionInput } from "@/lib/profileCompletion";

/** Score at or above which a name is treated as the same institution. */
export const STRONG_MATCH = CERTAIN_MATCH;
/** Score at or above which a university is flagged as a possible duplicate. */
export const WEAK_MATCH = 60;

export interface SuggestionInput {
  universityName: string;
  facultyName: string;
  departmentName: string;
}

interface NamedRef {
  id: string;
  name: string;
}

export type Classification =
  | {
      outcome: "auto_resolved";
      university: NamedRef & { abbreviation: string };
      faculty: NamedRef;
      department: NamedRef;
    }
  | {
      outcome: "suggestion";
      status: Extract<SuggestionStatus, "pending" | "possible_duplicate" | "linked_duplicate">;
      scope: SuggestionScope;
      existingUniversity?: NamedRef & { abbreviation: string };
      existingFaculty?: NamedRef;
      linkedToSuggestionId?: string;
      duplicateOfUniversityId?: string;
      /** Best university score, for logging/testing. */
      universityScore: number;
    };

/**
 * Works out whether the submitted school already exists (fully or partly),
 * probably exists, or matches another student's pending suggestion.
 * `userId` excludes the submitter's own suggestions from linking.
 */
export async function classifySuggestion(
  input: SuggestionInput,
  userId?: string,
): Promise<Classification> {
  const University = await getUniversityModel();
  const universities = await University.find({ isActive: true })
    .select("_id name abbreviation")
    .lean();

  const matches = findSimilar(
    input.universityName,
    universities.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      abbreviation: u.abbreviation,
    })),
    WEAK_MATCH,
    "university",
  );
  const best = matches[0];

  if (best && best.score >= STRONG_MATCH) {
    const uni = universities.find((u) => u._id.toString() === best.id)!;
    const university = { id: best.id, name: uni.name, abbreviation: uni.abbreviation };

    const Faculty = await getFacultyModel();
    const faculties = await Faculty.find({ universityId: best.id, isActive: true })
      .select("_id name abbreviation")
      .lean();
    const facultyMatch = findSimilar(
      input.facultyName,
      faculties.map((f) => ({ id: f._id.toString(), name: f.name, abbreviation: f.abbreviation })),
      STRONG_MATCH,
      "unit",
    )[0];

    if (!facultyMatch) {
      return {
        outcome: "suggestion",
        status: "pending",
        scope: "faculty_department",
        existingUniversity: university,
        universityScore: best.score,
      };
    }
    const faculty = { id: facultyMatch.id, name: facultyMatch.name };

    const Department = await getDepartmentModel();
    const departments = await Department.find({
      universityId: best.id,
      facultyId: facultyMatch.id,
      isActive: true,
    })
      .select("_id name abbreviation")
      .lean();
    const deptMatch = findSimilar(
      input.departmentName,
      departments.map((d) => ({ id: d._id.toString(), name: d.name, abbreviation: d.abbreviation })),
      STRONG_MATCH,
      "unit",
    )[0];

    if (deptMatch) {
      return {
        outcome: "auto_resolved",
        university,
        faculty,
        department: { id: deptMatch.id, name: deptMatch.name },
      };
    }
    return {
      outcome: "suggestion",
      status: "pending",
      scope: "department_only",
      existingUniversity: university,
      existingFaculty: faculty,
      universityScore: best.score,
    };
  }

  if (best) {
    // 60–84: probably an existing university spelled differently
    return {
      outcome: "suggestion",
      status: "possible_duplicate",
      scope: "full",
      duplicateOfUniversityId: best.id,
      universityScore: best.score,
    };
  }

  // Not on the platform: has another student already suggested it?
  const Suggestion = await getSchoolSuggestionModel();
  const pending = await Suggestion.find({
    status: { $in: ["pending", "possible_duplicate"] },
    suggestionScope: "full",
    ...(userId ? { submittedBy: { $ne: userId } } : {}),
  })
    .select("_id suggestedUniversityName suggestedUniversityAbbr")
    .lean();
  const linked = findSimilar(
    input.universityName,
    pending.map((s) => ({
      id: s._id.toString(),
      name: s.suggestedUniversityName,
      abbreviation: s.suggestedUniversityAbbr,
    })),
    STRONG_MATCH,
    "university",
  )[0];

  return linked
    ? {
        outcome: "suggestion",
        status: "linked_duplicate",
        scope: "full",
        linkedToSuggestionId: linked.id,
        universityScore: 0,
      }
    : { outcome: "suggestion", status: "pending", scope: "full", universityScore: 0 };
}

/**
 * The fields profile completion needs from a user's pending suggestion, or
 * null when there's none or it's no longer awaiting review.
 */
export async function loadPendingSuggestionForCompletion(
  pendingSuggestionId: Types.ObjectId | undefined,
): Promise<PendingSuggestionInput | null> {
  if (!pendingSuggestionId) return null;
  const Suggestion = await getSchoolSuggestionModel();
  const suggestion = await Suggestion.findOne({
    _id: pendingSuggestionId,
    status: { $in: ACTIVE_SUGGESTION_STATUSES },
  })
    .select("suggestionScope existingUniversityId existingFacultyId")
    .lean();
  return suggestion ?? null;
}

/**
 * Marks a suggestion withdrawn if it's still awaiting review, and lowers the
 * priority of the suggestion it was linked to. Returns false when it was
 * already decided (a concurrent admin decision wins).
 */
export async function withdrawSuggestion(
  suggestion: { _id: Types.ObjectId; linkedToSuggestionId?: Types.ObjectId },
  reviewNote?: string,
): Promise<boolean> {
  const Suggestion = await getSchoolSuggestionModel();
  const updated = await Suggestion.updateOne(
    { _id: suggestion._id, status: { $in: ACTIVE_SUGGESTION_STATUSES } },
    { $set: { status: "withdrawn", ...(reviewNote ? { reviewNote } : {}) } },
  );
  if (updated.modifiedCount === 0) return false;

  if (suggestion.linkedToSuggestionId) {
    await Suggestion.updateOne(
      { _id: suggestion.linkedToSuggestionId, adminPriority: { $gt: 1 } },
      { $inc: { adminPriority: -1 } },
    );
  }
  return true;
}

/**
 * Before a user's school changes (new suggestion or auto-resolve), withdraws
 * their most recent suggestion that still awaits review, if it's within its
 * 24h window. Older ones stay in the admin queue: the school may still be
 * valid even though this user moved on.
 */
export async function autoWithdrawPreviousSuggestion(userId: string): Promise<void> {
  const Suggestion = await getSchoolSuggestionModel();
  const previous = await Suggestion.findOne({
    submittedBy: userId,
    status: { $in: ACTIVE_SUGGESTION_STATUSES },
  })
    .sort({ submittedAt: -1 })
    .select("_id linkedToSuggestionId canWithdrawUntil")
    .lean();
  if (!previous || new Date() >= previous.canWithdrawUntil) return;

  await withdrawSuggestion(
    previous,
    "Auto-withdrawn when user submitted a new suggestion",
  );
}
