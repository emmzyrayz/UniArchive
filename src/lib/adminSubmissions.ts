// src/lib/adminSubmissions.ts
// Shared logic for the reviewer-side submission routes under
// /api/admin/submissions. Like lib/submissions.ts, helpers throw a ready-made
// JSON Response on failure, which handleRouteError passes straight through.
import { NextResponse } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import {
  getMaterialSubmissionModel,
  type IMaterialSubmission,
  type IReviewNote,
  type SubmissionStatus,
} from "@/lib/models/materialSubmissionModel";
import { getMaterialModel, type VerificationTier } from "@/lib/models/materialModel";
import { decryptSensitiveData } from "@/lib/encryption";
import type { SessionUser } from "@/lib/auth/session";

/** Drafts are private to the submitter; reviewers see everything else. */
export const REVIEWER_VISIBLE_STATUSES = [
  "submitted",
  "in_review",
  "verified",
  "rejected",
] as const satisfies readonly SubmissionStatus[];
export type ReviewerVisibleStatus = (typeof REVIEWER_VISIBLE_STATUSES)[number];

/** Statuses a reviewer can still verify or reject. */
export const DECIDABLE_STATUSES: SubmissionStatus[] = ["submitted", "in_review"];

export const MAX_NOTE_LENGTH = 1000;

function fail(status: number, message: string): never {
  throw NextResponse.json({ message }, { status });
}

/** Loads a submission a reviewer may act on; drafts read as not found. */
export async function loadReviewableSubmission(id: string): Promise<IMaterialSubmission> {
  if (!isValidObjectId(id)) fail(404, "Submission not found.");
  const Submission = await getMaterialSubmissionModel();
  const submission = await Submission.findById(id).lean();
  if (!submission || submission.status === "draft") fail(404, "Submission not found.");
  return submission;
}

/**
 * Validates an optional (or, with `required`, mandatory) free-text field.
 * Returns undefined for a missing/blank optional value.
 */
export function parseText(
  value: unknown,
  field: string,
  { required = false, max = MAX_NOTE_LENGTH } = {},
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) fail(400, `${field} is required.`);
    return undefined;
  }
  if (typeof value !== "string") fail(400, `${field} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) fail(400, `${field} is required.`);
    return undefined;
  }
  if (trimmed.length > max) fail(400, `${field} must be at most ${max} characters.`);
  return trimmed;
}

export function reviewNote(session: SessionUser, note: string): IReviewNote {
  return {
    authorId: new Types.ObjectId(session.userId),
    authorUpid: session.upid,
    authorRole: session.role,
    note,
    createdAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface AdminSubmissionDto {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  status: SubmissionStatus;
  submittedBy: { id: string; upid: string; name: string };
  submittedAt?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyName?: string;
  departmentName?: string;
  courseCode?: string;
  courseName?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
  language: string;
  tags: string[];
  bookId: string;
  reviewUrl: string;
  reviewedBy?: { id: string; upid: string; role: string };
  reviewStartedAt?: string;
  verifiedAt?: string;
  /** Tier of the published Material; only on verified submissions. */
  verificationTier?: VerificationTier;
  rejectionReason?: string;
  reviewNotes: { authorUpid: string; authorRole: string; note: string; createdAt: string }[];
}

interface UserSummary {
  upid: string;
  fullName: string;
  role: string;
}

/** Looks up the people referenced by a page of submissions in one query. */
export async function loadUserSummaries(
  submissions: Pick<IMaterialSubmission, "submittedBy" | "reviewedBy">[],
): Promise<Map<string, UserSummary>> {
  const ids = new Set<string>();
  for (const s of submissions) {
    ids.add(s.submittedBy.toString());
    if (s.reviewedBy) ids.add(s.reviewedBy.toString());
  }
  if (!ids.size) return new Map();
  const User = await getUserModel();
  const users = await User.find({ _id: { $in: [...ids] } })
    .select("upid fullName role")
    .lean();
  return new Map(
    users.map((u) => [String(u._id), { upid: u.upid, fullName: u.fullName, role: u.role }]),
  );
}

/** Verification tier per verified submission id, from the Material records. */
export async function loadVerificationTiers(
  submissions: Pick<IMaterialSubmission, "_id" | "status">[],
): Promise<Map<string, VerificationTier>> {
  const ids = submissions.filter((s) => s.status === "verified").map((s) => s._id);
  if (!ids.length) return new Map();
  const Material = await getMaterialModel();
  const materials = await Material.find({ submissionId: { $in: ids } })
    .select("submissionId verificationTier")
    .lean();
  return new Map(materials.map((m) => [m.submissionId.toString(), m.verificationTier]));
}

export function toAdminSubmissionDto(
  s: IMaterialSubmission,
  users: Map<string, UserSummary>,
  tiers: Map<string, VerificationTier> = new Map(),
): AdminSubmissionDto {
  const submitter = users.get(s.submittedBy.toString());
  const reviewer = s.reviewedBy ? users.get(s.reviewedBy.toString()) : undefined;
  return {
    id: String(s._id),
    title: s.title,
    description: s.description,
    category: s.category,
    subcategory: s.subcategory,
    status: s.status,
    submittedBy: {
      id: s.submittedBy.toString(),
      upid: s.submittedByUpid,
      name: submitter?.fullName ?? s.submittedByUpid,
    },
    submittedAt: s.submittedAt?.toISOString(),
    universityName: s.universityName,
    universityAbbr: s.universityAbbr,
    facultyName: s.facultyName,
    departmentName: s.departmentName,
    courseCode: s.courseCode,
    courseName: s.courseName,
    level: s.level,
    semester: s.semester,
    academicYear: s.academicYear,
    language: s.language,
    tags: s.tags ?? [],
    bookId: s.bookId.toString(),
    reviewUrl: `/read/${s.bookId.toString()}`,
    reviewedBy: s.reviewedBy
      ? {
          id: s.reviewedBy.toString(),
          upid: reviewer?.upid ?? "unknown",
          role: reviewer?.role ?? "unknown",
        }
      : undefined,
    reviewStartedAt: s.reviewStartedAt?.toISOString(),
    verifiedAt: s.verifiedAt?.toISOString(),
    verificationTier: tiers.get(String(s._id)),
    rejectionReason: s.rejectionReason,
    reviewNotes: (s.reviewNotes ?? []).map((n) => ({
      authorUpid: n.authorUpid,
      authorRole: n.authorRole,
      note: n.note,
      createdAt: new Date(n.createdAt).toISOString(),
    })),
  };
}

/** Builds the single-submission response used after every reviewer action. */
export async function adminSubmissionResponse(
  submission: IMaterialSubmission,
): Promise<AdminSubmissionDto> {
  const [users, tiers] = await Promise.all([
    loadUserSummaries([submission]),
    loadVerificationTiers([submission]),
  ]);
  return toAdminSubmissionDto(submission, users, tiers);
}

// ---------------------------------------------------------------------------
// Submitter contact
// ---------------------------------------------------------------------------

/**
 * The submitter's decrypted email and first name, or null if the account is
 * gone or the address can't be decrypted. Never throws: a notification
 * failure must not undo a review decision.
 */
export async function loadSubmitterContact(
  userId: Types.ObjectId | string,
): Promise<{ email: string; name: string } | null> {
  try {
    const User = await getUserModel();
    const user = await User.findById(userId).select("email fullName firstName").lean();
    if (!user) return null;
    return {
      email: decryptSensitiveData(user.email),
      name: user.firstName || user.fullName.split(" ")[0] || user.fullName,
    };
  } catch (error) {
    console.error("loadSubmitterContact failed:", error);
    return null;
  }
}
