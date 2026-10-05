// src/lib/suggestionReview.ts
// Admin decisions on school suggestions: approve (create what's missing),
// mark as duplicate (link to an existing university), reject.
//
// A suggestion can have "linked" suggestions from other students who named
// the same new university. They were linked by university name only, so
// their faculty and department can differ. When the university is settled,
// each linked suggestion is matched against it on its own:
//   - faculty and department both exist -> approved with the group, its
//     users' profiles are completed
//   - only some of it exists -> its users get what exists, and it goes back
//     to the queue as a narrower suggestion (faculty_department or
//     department_only) for an admin to add the rest
// Users are found by pendingSuggestionId, so someone who has since changed
// school isn't moved back.
import { Types } from "mongoose";
import { findSimilar } from "@/lib/fuzzyMatch";
import { getUserModel } from "@/lib/models/userModel";
import { getSurveyResponseModel } from "@/lib/models/surveyResponseModel";
import {
  getSchoolSuggestionModel,
  type ISchoolSuggestion,
  type SuggestionStatus,
} from "@/lib/models/schoolSuggestionModel";
import { getUniversityModel, type IUniversity } from "@/lib/models/university/universityModel";
import type { IFaculty } from "@/lib/models/university/facultyModel";
import type { IDepartment } from "@/lib/models/university/departmentModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import {
  checkName,
  checkNewUniversity,
  createUniversity,
  findDepartment,
  findFaculty,
  findOrCreateDepartment,
  findOrCreateFaculty,
  normaliseAbbr,
  refreshInstitutionCounts,
} from "@/lib/institutionAdmin";
import type { AdminSuggestionDto } from "@/types/admin";
import type { UniversityOwnership } from "@/lib/models/university/universityModel";

/** Statuses an admin can decide directly (linked ones follow their parent). */
export const DECIDABLE_SUGGESTION_STATUSES: SuggestionStatus[] = ["pending", "possible_duplicate"];

export class ReviewError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Reviewer {
  userId: string;
  upid: string;
}

type UniRef = Pick<IUniversity, "_id" | "name" | "abbreviation">;
type FacultyRef = Pick<IFaculty, "_id" | "name">;
type DepartmentRef = Pick<IDepartment, "_id" | "name">;

export interface DecisionSummary {
  usersUpdated: number;
  linkedApproved: number;
  linkedRequeued: number;
}

// --- Users --------------------------------------------------------------------

/**
 * Points every user still waiting on `suggestionId` at the given place. With
 * a department their profile is complete and the pending link is cleared;
 * otherwise they keep waiting on the (narrowed) suggestion.
 */
async function placeUsers(
  suggestionId: Types.ObjectId,
  university: UniRef,
  faculty?: FacultyRef,
  department?: DepartmentRef,
): Promise<number> {
  const User = await getUserModel();
  const set: Record<string, unknown> = {
    universityId: university._id,
    universityName: university.name,
    universityAbbr: university.abbreviation,
    school: university.name,
  };
  if (faculty) Object.assign(set, { facultyId: faculty._id, facultyName: faculty.name, faculty: faculty.name });
  if (department) {
    Object.assign(set, {
      departmentId: department._id,
      departmentName: department.name,
      department: department.name,
    });
  }
  const result = await User.updateMany(
    { pendingSuggestionId: suggestionId },
    { $set: set, ...(department ? { $unset: { pendingSuggestionId: "" } } : {}) },
  );
  await placeSurveyResponses(suggestionId, university, faculty, department);
  return result.modifiedCount;
}

/**
 * Survey responses that typed this school get the catalog records, so
 * results filters pick them up. They keep pointing at the suggestion until
 * it is complete, like users do.
 */
async function placeSurveyResponses(
  suggestionId: Types.ObjectId,
  university: UniRef,
  faculty?: FacultyRef,
  department?: DepartmentRef,
): Promise<void> {
  const Response = await getSurveyResponseModel();
  const set: Record<string, unknown> = {
    "respondent.universityId": university._id,
    "respondent.universityName": university.name,
    "respondent.universityAbbr": university.abbreviation,
  };
  if (faculty) Object.assign(set, { "respondent.facultyId": faculty._id, "respondent.facultyName": faculty.name });
  if (department) {
    Object.assign(set, { "respondent.departmentId": department._id, "respondent.departmentName": department.name });
  }
  await Response.updateMany(
    { schoolSuggestionId: suggestionId },
    { $set: set, $unset: { "respondent.schoolUnlisted": "", ...(department ? { schoolSuggestionId: "" } : {}) } },
  );
}

// --- Matching one suggestion against a settled university ----------------------

async function activeFaculty(universityId: Types.ObjectId, name: string) {
  const f = await findFaculty(universityId, name);
  return f?.isActive ? f : null;
}

async function activeDepartment(facultyId: Types.ObjectId, name: string) {
  const d = await findDepartment(facultyId, name);
  return d?.isActive ? d : null;
}

interface Placement {
  faculty: FacultyRef | null;
  department: DepartmentRef | null;
}

/** Where `s` fits in `university`: its faculty and department, if they exist. */
async function matchPlacement(
  s: Pick<ISchoolSuggestion, "suggestedFacultyName" | "suggestedDepartmentName">,
  university: UniRef,
  knownFaculty?: FacultyRef | null,
): Promise<Placement> {
  const faculty = knownFaculty ?? (await activeFaculty(university._id, s.suggestedFacultyName));
  const department = faculty ? await activeDepartment(faculty._id, s.suggestedDepartmentName) : null;
  return { faculty, department };
}

/**
 * The suggestion update for a placement: approved when complete, otherwise
 * narrowed to what's still missing and back in the queue.
 */
function placementUpdate(
  place: Placement,
  university: UniRef,
  reviewer: Reviewer,
  note: string,
  extra: Record<string, unknown>,
): { set: Record<string, unknown>; unset: Record<string, ""> } {
  if (place.faculty && place.department) {
    return {
      set: { status: "approved", reviewedBy: reviewer.userId, reviewedAt: new Date(), reviewNote: note, ...extra },
      unset: {},
    };
  }
  return {
    set: {
      status: "pending",
      suggestionScope: place.faculty ? "department_only" : "faculty_department",
      existingUniversityId: university._id,
      ...(place.faculty ? { existingFacultyId: place.faculty._id } : {}),
      ...extra,
    },
    unset: { linkedToSuggestionId: "", ...(place.faculty ? {} : { existingFacultyId: "" }) },
  };
}

const placeUsersAt = (id: Types.ObjectId, university: UniRef, place: Placement) =>
  placeUsers(id, university, place.faculty ?? undefined, place.department ?? undefined);

/** Settles every suggestion linked to `parentId` against `university`. */
async function settleLinked(
  parentId: Types.ObjectId,
  university: UniRef,
  reviewer: Reviewer,
  note: string,
  extra: Record<string, unknown> = {},
): Promise<DecisionSummary> {
  const Suggestion = await getSchoolSuggestionModel();
  const linked = await Suggestion.find({ linkedToSuggestionId: parentId, status: "linked_duplicate" })
    .select("_id suggestedFacultyName suggestedDepartmentName")
    .lean();
  const summary: DecisionSummary = { usersUpdated: 0, linkedApproved: 0, linkedRequeued: 0 };
  for (const s of linked) {
    const place = await matchPlacement(s, university);
    const { set, unset } = placementUpdate(place, university, reviewer, note, extra);
    await Suggestion.updateOne(
      { _id: s._id, status: "linked_duplicate" },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    );
    summary.usersUpdated += await placeUsersAt(s._id, university, place);
    if (place.department) summary.linkedApproved += 1;
    else summary.linkedRequeued += 1;
  }
  return summary;
}

// --- Claiming ---------------------------------------------------------------------

/** Loads a suggestion an admin can decide right now, or throws. */
export async function loadDecidable(id: string): Promise<ISchoolSuggestion> {
  if (!Types.ObjectId.isValid(id)) throw new ReviewError(404, "Suggestion not found.");
  const Suggestion = await getSchoolSuggestionModel();
  const s = await Suggestion.findById(id).lean<ISchoolSuggestion>();
  if (!s) throw new ReviewError(404, "Suggestion not found.");
  if (s.status === "linked_duplicate") {
    throw new ReviewError(409, "This suggestion is linked to another one. Decide that one instead.");
  }
  if (!DECIDABLE_SUGGESTION_STATUSES.includes(s.status)) {
    throw new ReviewError(409, `This suggestion is already ${s.status.replace("_", " ")}.`);
  }
  return s;
}

/**
 * Atomically moves a still-undecided suggestion to its final status, so two
 * admins can't both decide it. Throws 409 if someone else got there first.
 */
async function claim(id: Types.ObjectId, set: Record<string, unknown>, unset?: Record<string, "">) {
  const Suggestion = await getSchoolSuggestionModel();
  const claimed = await Suggestion.findOneAndUpdate(
    { _id: id, status: { $in: DECIDABLE_SUGGESTION_STATUSES } },
    { $set: set, ...(unset ? { $unset: unset } : {}) },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) throw new ReviewError(409, "This suggestion was just decided by someone else. Reload.");
  return claimed;
}

async function loadActiveUniversity(id: string | Types.ObjectId | undefined): Promise<IUniversity> {
  if (!id || !Types.ObjectId.isValid(String(id))) throw new ReviewError(400, "Choose an existing university.");
  const University = await getUniversityModel();
  const university = await University.findOne({ _id: id, isActive: true }).lean<IUniversity>();
  if (!university) throw new ReviewError(404, "That university doesn't exist or has been deactivated.");
  return university;
}

async function loadActiveFacultyOf(universityId: Types.ObjectId, id: string | Types.ObjectId) {
  if (!Types.ObjectId.isValid(String(id))) throw new ReviewError(400, "Choose an existing faculty.");
  const Faculty = await getFacultyModel();
  const faculty = await Faculty.findOne({ _id: id, universityId, isActive: true }).lean<IFaculty>();
  if (!faculty) throw new ReviewError(404, "That faculty doesn't belong to this university.");
  return faculty;
}

// --- Approve ----------------------------------------------------------------------

export interface ApproveOverrides {
  universityName?: string;
  universityAbbr?: string;
  universityState?: string;
  universityOwnership?: UniversityOwnership;
  facultyName?: string;
  departmentName?: string;
  existingUniversityId?: string;
  existingFacultyId?: string;
}

/**
 * Creates whatever the suggestion is missing (university, faculty,
 * department, per its scope; or links to existingUniversityId /
 * existingFacultyId when given), completes its users' profiles, and settles
 * any linked suggestions.
 */
export async function approveSuggestion(
  s: ISchoolSuggestion,
  overrides: ApproveOverrides,
  reviewer: Reviewer,
): Promise<DecisionSummary> {
  const facultyName = (overrides.facultyName ?? s.suggestedFacultyName).trim();
  const departmentName = (overrides.departmentName ?? s.suggestedDepartmentName).trim();
  const invalid = checkName("Faculty name", facultyName) ?? checkName("Department name", departmentName);
  if (invalid) throw new ReviewError(400, invalid);

  // 1. The university
  let university: IUniversity;
  let createdUniversity = false;
  if (overrides.existingUniversityId) {
    university = await loadActiveUniversity(overrides.existingUniversityId);
  } else if (s.suggestionScope !== "full") {
    university = await loadActiveUniversity(s.existingUniversityId);
  } else {
    const input = {
      name: (overrides.universityName ?? s.suggestedUniversityName).trim(),
      abbreviation: normaliseAbbr(overrides.universityAbbr ?? s.suggestedUniversityAbbr ?? ""),
      state: (overrides.universityState ?? s.suggestedUniversityState ?? "") as string,
      ownership: (overrides.universityOwnership ?? s.suggestedUniversityOwnership) as UniversityOwnership,
    };
    const bad = checkNewUniversity(input);
    if (bad) throw new ReviewError(400, bad);

    const University = await getUniversityModel();
    const clash = await University.findOne({ abbreviation: input.abbreviation }).lean<IUniversity>();
    if (clash && clash.name.toLowerCase() !== input.name.toLowerCase()) {
      throw new ReviewError(
        409,
        `${clash.name} already uses the abbreviation ${input.abbreviation}. Change it, or mark this as a duplicate.`,
      );
    }
    // A same-named clash is this approval's own university from an earlier
    // attempt that failed part-way: reuse it
    if (clash) {
      university = clash;
    } else {
      university = await createUniversity(input, reviewer.userId, "suggestion");
      createdUniversity = true;
    }
  }

  // 2. The faculty
  let faculty: FacultyRef;
  let createdFaculty = false;
  if (overrides.existingFacultyId) {
    faculty = await loadActiveFacultyOf(university._id, overrides.existingFacultyId);
  } else if (s.suggestionScope === "department_only" && !overrides.existingUniversityId && s.existingFacultyId) {
    faculty = await loadActiveFacultyOf(university._id, s.existingFacultyId);
  } else {
    const result = await findOrCreateFaculty(university, { name: facultyName }, reviewer.userId);
    faculty = result.faculty;
    createdFaculty = result.created;
  }

  // 3. The department
  const { department, created: createdDepartment } = await findOrCreateDepartment(
    university,
    faculty,
    { name: departmentName },
    reviewer.userId,
  );
  await refreshInstitutionCounts(university._id, faculty._id);

  // 4. Decide, then move people
  const note = `Approved: ${university.name} / ${faculty.name} / ${department.name}`;
  await claim(s._id, {
    status: "approved",
    reviewedBy: reviewer.userId,
    reviewedAt: new Date(),
    reviewNote: note,
    ...(createdUniversity ? { createdUniversityId: university._id } : {}),
    ...(createdFaculty ? { createdFacultyId: faculty._id } : {}),
    ...(createdDepartment ? { createdDepartmentId: department._id } : {}),
  });

  const usersUpdated = await placeUsers(s._id, university, faculty, department);
  const linked = await settleLinked(s._id, university, reviewer, note);
  return { ...linked, usersUpdated: usersUpdated + linked.usersUpdated };
}

// --- Mark as duplicate ------------------------------------------------------------

/**
 * The suggested university already exists. Links the suggestion (and its
 * linked ones) to it without creating anything: complete where the faculty
 * and department exist there, narrowed back into the queue where they don't.
 */
export async function markDuplicate(
  s: ISchoolSuggestion,
  existingUniversityId: string,
  existingFacultyId: string | undefined,
  reviewer: Reviewer,
): Promise<DecisionSummary & { requeued: boolean }> {
  const university = await loadActiveUniversity(existingUniversityId);
  const faculty = existingFacultyId
    ? await loadActiveFacultyOf(university._id, existingFacultyId)
    : null;
  const note = `Duplicate of existing university: ${university.name}`;
  const extra = { duplicateOfUniversityId: university._id };

  const place = await matchPlacement(s, university, faculty);
  const { set, unset } = placementUpdate(place, university, reviewer, note, extra);
  await claim(s._id, set, Object.keys(unset).length ? unset : undefined);

  const usersUpdated = await placeUsersAt(s._id, university, place);
  const linked = await settleLinked(s._id, university, reviewer, note, extra);
  return {
    usersUpdated: usersUpdated + linked.usersUpdated,
    linkedApproved: linked.linkedApproved,
    linkedRequeued: linked.linkedRequeued,
    requeued: !place.department,
  };
}

// --- Reject -------------------------------------------------------------------------

/**
 * Rejects the suggestion. Its users stop waiting on it (and can suggest
 * again). Linked suggestions are other students' own claims, so they go back
 * into the queue on their own instead of being rejected with it.
 */
export async function rejectSuggestion(
  s: ISchoolSuggestion,
  reviewNote: string,
  reviewer: Reviewer,
): Promise<DecisionSummary> {
  await claim(s._id, {
    status: "rejected",
    reviewNote,
    reviewedBy: reviewer.userId,
    reviewedAt: new Date(),
  });
  const User = await getUserModel();
  const Suggestion = await getSchoolSuggestionModel();
  const [users, linked] = await Promise.all([
    User.updateMany({ pendingSuggestionId: s._id }, { $unset: { pendingSuggestionId: "" } }),
    Suggestion.updateMany(
      { linkedToSuggestionId: s._id, status: "linked_duplicate" },
      { $set: { status: "pending", adminPriority: 1 }, $unset: { linkedToSuggestionId: "" } },
    ),
  ]);
  return { usersUpdated: users.modifiedCount, linkedApproved: 0, linkedRequeued: linked.modifiedCount };
}

// --- Listing ------------------------------------------------------------------------

/** Suggestions as the admin queue shows them, with their related records. */
export async function toAdminSuggestionDtos(docs: ISchoolSuggestion[]): Promise<AdminSuggestionDto[]> {
  if (docs.length === 0) return [];
  const ids = docs.map((d) => d._id);
  const Suggestion = await getSchoolSuggestionModel();
  const linked = await Suggestion.find({ linkedToSuggestionId: { $in: ids }, status: "linked_duplicate" })
    .select("_id linkedToSuggestionId")
    .lean();

  const User = await getUserModel();
  const waiting = await User.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { pendingSuggestionId: { $in: [...ids, ...linked.map((l) => l._id)] } } },
    { $group: { _id: "$pendingSuggestionId", count: { $sum: 1 } } },
  ]);
  const waitingBy = new Map(waiting.map((w) => [String(w._id), w.count]));
  const Response = await getSurveyResponseModel();
  const answered = await Response.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { schoolSuggestionId: { $in: [...ids, ...linked.map((l) => l._id)] } } },
    { $group: { _id: "$schoolSuggestionId", count: { $sum: 1 } } },
  ]);
  const answeredBy = new Map(answered.map((w) => [String(w._id), w.count]));

  const isId = (v: Types.ObjectId | undefined): v is Types.ObjectId => !!v;
  const universityIds = docs.flatMap((d) => [d.existingUniversityId, d.duplicateOfUniversityId]).filter(isId);
  const facultyIds = docs.map((d) => d.existingFacultyId).filter(isId);
  const [University, Faculty] = await Promise.all([getUniversityModel(), getFacultyModel()]);
  const [universities, faculties] = await Promise.all([
    University.find({ _id: { $in: universityIds } }).select("name abbreviation").lean<IUniversity[]>(),
    Faculty.find({ _id: { $in: facultyIds } }).select("name").lean<IFaculty[]>(),
  ]);
  const uni = new Map(universities.map((u) => [String(u._id), u]));
  const fac = new Map(faculties.map((f) => [String(f._id), f]));

  return docs.map((d) => {
    const id = String(d._id);
    const myLinked = linked.filter((l) => String(l.linkedToSuggestionId) === id);
    const affectedUsers =
      (waitingBy.get(id) ?? 0) + myLinked.reduce((n, l) => n + (waitingBy.get(String(l._id)) ?? 0), 0);

    const existing = d.existingUniversityId ? uni.get(String(d.existingUniversityId)) : undefined;
    const facultyDoc = d.existingFacultyId ? fac.get(String(d.existingFacultyId)) : undefined;
    const similar = d.duplicateOfUniversityId ? uni.get(String(d.duplicateOfUniversityId)) : undefined;
    const score = similar
      ? (findSimilar(
          d.suggestedUniversityName,
          [{ id: String(similar._id), name: similar.name, abbreviation: similar.abbreviation }],
          0,
          "university",
        )[0]?.score ?? 0)
      : 0;

    return {
      id,
      status: d.status,
      scope: d.suggestionScope,
      suggestedUniversityName: d.suggestedUniversityName,
      suggestedUniversityAbbr: d.suggestedUniversityAbbr,
      suggestedUniversityState: d.suggestedUniversityState,
      suggestedUniversityOwnership: d.suggestedUniversityOwnership,
      suggestedFacultyName: d.suggestedFacultyName,
      suggestedDepartmentName: d.suggestedDepartmentName,
      submittedByUpid: d.submittedByUpid || undefined,
      source: d.source ?? "profile",
      surveyResponses:
        (answeredBy.get(id) ?? 0) + myLinked.reduce((n, l) => n + (answeredBy.get(String(l._id)) ?? 0), 0),
      submittedAt: new Date(d.submittedAt).toISOString(),
      adminPriority: d.adminPriority ?? 1,
      linkedCount: myLinked.length,
      affectedUsers,
      existingUniversity: existing
        ? { id: String(existing._id), name: existing.name, abbreviation: existing.abbreviation }
        : undefined,
      existingFaculty: facultyDoc ? { id: String(facultyDoc._id), name: facultyDoc.name } : undefined,
      similarUniversity: similar
        ? { id: String(similar._id), name: similar.name, abbreviation: similar.abbreviation, score }
        : undefined,
      linkedToSuggestionId: d.linkedToSuggestionId ? String(d.linkedToSuggestionId) : undefined,
      reviewNote: d.reviewNote,
      reviewedAt: d.reviewedAt ? new Date(d.reviewedAt).toISOString() : undefined,
    };
  });
}
