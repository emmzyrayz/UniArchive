// src/lib/submissions.ts
// Shared logic for UniLibrary material submissions: input validation,
// institution lookup, the eligibility gates and the create/update write.
// Helpers throw a ready-made JSON Response on failure (like requireAuth), which
// handleRouteError passes straight through.
import { NextResponse } from "next/server";
import { isValidObjectId, type Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";
import { getBookModel, type IBook } from "@/lib/models/bookModel";
import {
  EDITABLE_SUBMISSION_STATUSES,
  IN_PIPELINE_SUBMISSION_STATUSES,
  SUBMISSION_LEVELS,
  SUBMISSION_SEMESTERS,
  getMaterialSubmissionModel,
  type IMaterialSubmission,
} from "@/lib/models/materialSubmissionModel";
import { isMaterialCategory, isSubcategoryOf } from "@/lib/constants/materialCategories";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { loadPendingSuggestionForCompletion } from "@/lib/schoolSuggestions";
import type { SessionUser } from "@/lib/auth/session";
import { PROFILE_LEVELS, PROFILE_SEMESTERS } from "@/lib/constants/profile";

export const MAX_SUBMISSION_TAGS = 10;

function fail(status: number, message: string): never {
  throw NextResponse.json({ message }, { status });
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

export interface AcademicRefs {
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
}

/**
 * Looks up the given university/faculty/department ids, checks they exist,
 * are active and belong together, and returns them with their names.
 * A faculty needs a university and a department needs a faculty.
 */
export async function resolveAcademicRefs(ids: {
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
}): Promise<AcademicRefs> {
  const { universityId, facultyId, departmentId } = ids;
  for (const [key, value] of Object.entries(ids)) {
    if (value && !isValidObjectId(value)) fail(400, `${key} is not a valid id.`);
  }
  if (facultyId && !universityId) fail(400, "facultyId requires universityId.");
  if (departmentId && !facultyId) fail(400, "departmentId requires facultyId.");
  if (!universityId) return {};

  const University = await getUniversityModel();
  const university = await University.findOne({ _id: universityId, isActive: true })
    .select("name abbreviation")
    .lean();
  if (!university) fail(404, "University not found.");
  const refs: AcademicRefs = {
    universityId: university._id,
    universityName: university.name,
    universityAbbr: university.abbreviation,
  };
  if (!facultyId) return refs;

  const Faculty = await getFacultyModel();
  const faculty = await Faculty.findOne({ _id: facultyId, universityId, isActive: true })
    .select("name")
    .lean();
  if (!faculty) fail(404, "Faculty not found at that university.");
  refs.facultyId = faculty._id;
  refs.facultyName = faculty.name;
  if (!departmentId) return refs;

  const Department = await getDepartmentModel();
  const department = await Department.findOne({
    _id: departmentId,
    facultyId,
    universityId,
    isActive: true,
  })
    .select("name")
    .lean();
  if (!department) fail(404, "Department not found in that faculty.");
  refs.departmentId = department._id;
  refs.departmentName = department.name;
  return refs;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type SubmissionAction = "save_draft" | "submit";

export interface SubmissionBody {
  bookId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  universityId: string;
  facultyId: string;
  departmentId: string;
  courseCode: string;
  courseName: string;
  level: string;
  semester: string;
  academicYear: string;
  tags: string[];
  language: string;
  action: SubmissionAction;
}

function str(body: Partial<SubmissionBody>, key: keyof SubmissionBody, max: number): string {
  const value = body[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") fail(400, `${key} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > max) fail(400, `${key} must be at most ${max} characters.`);
  return trimmed;
}

/** "300L" (profile style) or "300" -> "300"; "PG" and "Staff" pass through. */
export function toSubmissionLevel(level: string): string {
  return /^\d00L$/i.test(level) ? level.slice(0, -1) : level;
}

export interface ParsedSubmission {
  action: SubmissionAction;
  title: string; // empty = use the book's title
  description: string;
  category: string;
  subcategory?: string;
  institution: { universityId?: string; facultyId?: string; departmentId?: string };
  courseCode?: string;
  courseName?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
  tags: string[];
  language: string;
}

/** Validates the body shared by POST /api/submissions and PATCH /[id]. */
export function parseSubmissionBody(body: Partial<SubmissionBody> | null): ParsedSubmission {
  if (!body) fail(400, "Invalid request body.");

  const action = body.action;
  if (action !== "save_draft" && action !== "submit") {
    fail(400, 'action must be "save_draft" or "submit".');
  }

  const title = str(body, "title", 200);
  const description = str(body, "description", 2000);
  const category = str(body, "category", 40);
  const subcategory = str(body, "subcategory", 40);
  if (!description) fail(400, "A description is required.");
  if (!category) fail(400, "Choose a category.");
  if (!isMaterialCategory(category)) fail(400, "Unknown category.");
  if (subcategory && !isSubcategoryOf(category, subcategory)) {
    fail(400, "That subcategory doesn't belong to the chosen category.");
  }

  const courseCode = str(body, "courseCode", 12).toUpperCase().replace(/\s+/g, "");
  if (courseCode && !/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(courseCode)) {
    fail(400, "Course code should look like CSC301.");
  }
  const courseName = str(body, "courseName", 150);

  const level = toSubmissionLevel(str(body, "level", 10));
  if (level && !(SUBMISSION_LEVELS as readonly string[]).includes(level)) {
    fail(400, `level must be one of: ${SUBMISSION_LEVELS.join(", ")}.`);
  }
  const semester = str(body, "semester", 20);
  if (semester && !(SUBMISSION_SEMESTERS as readonly string[]).includes(semester)) {
    fail(400, `semester must be one of: ${SUBMISSION_SEMESTERS.join(", ")}.`);
  }
  const academicYear = str(body, "academicYear", 9);
  if (academicYear) {
    const m = /^(\d{4})\/(\d{4})$/.exec(academicYear);
    if (!m || Number(m[2]) !== Number(m[1]) + 1) {
      fail(400, "Academic year should look like 2023/2024.");
    }
  }

  let tags: string[] = [];
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) fail(400, "tags must be a list.");
    tags = [
      ...new Set(
        body.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().toLowerCase().slice(0, 30))
          .filter(Boolean),
      ),
    ];
    if (tags.length > MAX_SUBMISSION_TAGS) fail(400, `Use at most ${MAX_SUBMISSION_TAGS} tags.`);
  }

  return {
    action,
    title,
    description,
    category,
    subcategory: subcategory || undefined,
    institution: {
      universityId: str(body, "universityId", 30) || undefined,
      facultyId: str(body, "facultyId", 30) || undefined,
      departmentId: str(body, "departmentId", 30) || undefined,
    },
    courseCode: courseCode || undefined,
    courseName: courseName || undefined,
    level: level || undefined,
    semester: semester || undefined,
    academicYear: academicYear || undefined,
    tags,
    language: str(body, "language", 30) || "English",
  };
}

// ---------------------------------------------------------------------------
// Gates + write
// ---------------------------------------------------------------------------

/** 403 unless the user's profile is 100% complete. */
export async function requireCompleteProfile(userId: string): Promise<void> {
  const User = await getUserModel();
  const user = await User.findById(userId)
    .select(
      "isVerified phone profilePhoto fullName username bio dob universityId facultyId " +
        "departmentId level pendingSuggestionId",
    )
    .lean();
  if (!user) fail(401, "Authentication required");
  const completion = calculateProfileCompletion(
    user,
    await loadPendingSuggestionForCompletion(user.pendingSuggestionId),
  );
  if (!completion.canSubmitMaterials) {
    fail(
      403,
      `Your profile is ${completion.percentage}% complete. Complete your profile to submit materials to the UniLibrary.`,
    );
  }
}

type BookForSubmission = Pick<IBook, "title" | "description" | "uploaderId"> & {
  _id: Types.ObjectId;
};

/** Loads a book and 403s unless the caller owns it. */
export async function loadOwnedBook(bookId: string, userId: string): Promise<BookForSubmission> {
  if (!bookId || !isValidObjectId(bookId)) fail(400, "A valid bookId is required.");
  const Book = await getBookModel();
  const book = await Book.findById(bookId).select("title description uploaderId").lean();
  if (!book) fail(404, "Document not found.");
  if (book.uploaderId.toString() !== userId) {
    fail(403, "You can only submit documents from your own library.");
  }
  return book;
}

type ExistingSubmission = Pick<IMaterialSubmission, "_id" | "status">;

/**
 * Creates or updates the submission for `book` after running every gate.
 * `existing` is the book's current submission, if any.
 */
export async function saveSubmission(
  session: SessionUser,
  book: BookForSubmission,
  existing: ExistingSubmission | null,
  input: ParsedSubmission,
): Promise<IMaterialSubmission> {
  // --- Gates --------------------------------------------------------------
  await requireCompleteProfile(session.userId);
  if (!book.description?.trim()) {
    fail(403, "Add a description to this document before submitting it.");
  }
  if (existing?.status === "verified") {
    fail(403, "This document is already published in the UniLibrary.");
  }
  if (existing && IN_PIPELINE_SUBMISSION_STATUSES.includes(existing.status)) {
    fail(403, "This document is already being reviewed and can't be changed right now.");
  }
  if (input.action === "submit" && !input.institution.universityId) {
    fail(400, "Choose the university this material is for before submitting.");
  }

  const refs = await resolveAcademicRefs(input.institution);
  const now = new Date();
  const submitting = input.action === "submit";

  // Fields the form owns. Academic refs are replaced wholesale, so clearing
  // one in the form clears it here too.
  const fields = {
    title: input.title || book.title.slice(0, 200),
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    ...refs,
    courseCode: input.courseCode,
    courseName: input.courseName,
    level: input.level,
    semester: input.semester,
    academicYear: input.academicYear,
    tags: input.tags,
    language: input.language,
  };
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  const optionalKeys = [
    "subcategory", "universityId", "universityName", "universityAbbr", "facultyId",
    "facultyName", "departmentId", "departmentName", "courseCode", "courseName",
    "level", "semester", "academicYear",
  ];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined && optionalKeys.includes(key)) unset[key] = "";
    else set[key] = value;
  }
  for (const key of optionalKeys) if (!(key in fields)) unset[key] = "";
  if (submitting) {
    set.status = "submitted";
    set.submittedAt = now;
    unset.rejectionReason = "";
  }

  const Submission = await getMaterialSubmissionModel();
  let submission: IMaterialSubmission | null;
  if (existing) {
    // Conditional on the status so a concurrent reviewer action wins
    submission = await Submission.findOneAndUpdate(
      { _id: existing._id, status: { $in: EDITABLE_SUBMISSION_STATUSES } },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true },
    ).lean();
    if (!submission) fail(409, "This submission changed status. Reload and try again.");
  } else {
    try {
      const created = await Submission.create({
        ...set,
        bookId: book._id,
        submittedBy: session.userId,
        submittedByUpid: session.upid,
        status: submitting ? "submitted" : "draft",
      });
      submission = created.toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        fail(409, "This document already has a submission.");
      }
      throw error;
    }
  }

  const Book = await getBookModel();
  await Book.updateOne(
    { _id: book._id },
    { $set: { hasSubmission: true, submissionId: submission._id } },
  );
  if (submitting) {
    const User = await getUserModel();
    await User.updateOne({ _id: session.userId }, { $inc: { submissionCount: 1 } });
  }
  return submission;
}

// ---------------------------------------------------------------------------
// Book academic metadata (upload form)
// ---------------------------------------------------------------------------

export interface BookAcademicBody {
  universityId?: unknown;
  facultyId?: unknown;
  departmentId?: unknown;
  level?: unknown;
  semester?: unknown;
}

/**
 * Validates the optional academic fields sent with a new book and returns
 * what to store on it. Levels and semesters use the profile values.
 */
export async function resolveBookAcademic(
  body: BookAcademicBody | null | undefined,
): Promise<AcademicRefs & { level?: string; semester?: string }> {
  const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const refs = await resolveAcademicRefs({
    universityId: id(body?.universityId),
    facultyId: id(body?.facultyId),
    departmentId: id(body?.departmentId),
  });
  const level = id(body?.level);
  if (level && !(PROFILE_LEVELS as readonly string[]).includes(level)) {
    fail(400, `level must be one of: ${PROFILE_LEVELS.join(", ")}.`);
  }
  const semester = id(body?.semester);
  if (semester && !(PROFILE_SEMESTERS as readonly string[]).includes(semester)) {
    fail(400, `semester must be one of: ${PROFILE_SEMESTERS.join(", ")}.`);
  }
  return { ...refs, level, semester };
}
