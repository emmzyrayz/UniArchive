// src/lib/auth/permissions.ts
// The single permissions matrix. The API guards, navigation and UI flags all
// read from here.
import type { UserRole } from "@/types/roles";

type Action =
  | "upload"
  | "download"
  | "comment"
  | "moderate"
  | "manage_users"
  | "admin"
  | "delete"
  | "edit"
  | "audit"
  | "verify"
  | "teach"
  | "create_course"
  | "manage_institution"
  | "assign_role"
  // UniLibrary submission review
  | "admin.view_submissions" // see the admin submissions queue, add notes
  | "submission.review" // start a review
  | "submission.verify_tier1" // grant tier 1 (green badge)
  | "submission.verify_tier2" // grant tier 2 (gold crown), never on own submission
  | "submission.reject"; // reject with a reason

const PERMISSIONS: Record<UserRole, Action[]> = {
  student: ["download", "comment", "upload"],
  collaborator: ["download", "comment", "upload", "edit"],
  auditor: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "audit",
    "admin.view_submissions",
    "submission.review",
    "submission.verify_tier1",
    "submission.reject",
  ],
  course_rep: ["download", "comment", "upload", "edit", "moderate", "admin.view_submissions"],
  lecturer: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "delete",
    "verify",
    "teach",
    "create_course",
    "admin.view_submissions",
    "submission.verify_tier2",
  ],
  ed_admin: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "delete",
    "audit",
    "verify",
    "teach",
    "create_course",
    "manage_institution",
    "admin.view_submissions",
    "submission.review",
    "submission.verify_tier1",
    "submission.verify_tier2",
    "submission.reject",
  ],
  com_admin: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "manage_users",
    "admin",
    "delete",
    "audit",
    "verify",
    "teach",
    "create_course",
    "manage_institution",
    "admin.view_submissions",
    "submission.review",
    "submission.verify_tier1",
    "submission.verify_tier2",
    "submission.reject",
  ],
  webmaster: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "manage_users",
    "admin",
    "delete",
    "audit",
    "verify",
    "teach",
    "create_course",
    "manage_institution",
    "assign_role",
    "admin.view_submissions",
    "submission.review",
    "submission.verify_tier1",
    "submission.verify_tier2",
    "submission.reject",
  ],
  dev: [
    "download",
    "comment",
    "upload",
    "edit",
    "moderate",
    "manage_users",
    "admin",
    "delete",
    "audit",
    "verify",
    "teach",
    "create_course",
    "manage_institution",
    "assign_role",
    "admin.view_submissions",
    "submission.review",
    "submission.verify_tier1",
    "submission.verify_tier2",
    "submission.reject",
  ],
};

export function can(role: UserRole, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}

export function canAll(role: UserRole, actions: Action[]): boolean {
  return actions.every((action) => can(role, action));
}

export { PERMISSIONS };
export type { Action };
