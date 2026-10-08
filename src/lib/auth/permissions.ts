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
  | "submission.reject" // reject with a reason
  // Platform materials (credited to UniArchive, not the uploader)
  | "material.ingest" // bulk-upload PDFs and publish them after filling in details
  | "material.review_gifts" // publish PDFs students gifted to UniArchive
  // Email
  | "mail.send_user" // write to one user from /admin/mail (ZeptoMail)
  | "mail.broadcast" // compose and send bulk email (Brevo)
  // Surveys
  | "survey.manage" // build surveys and see their responses
  | "material.drive_inbox" // connect and run the Google Drive inbox (PDFs shared with UniArchive's Gmail)
  | "economy.manage"; // credits economy: prices, rewards, caps, modules on/off, adjustments

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
    "material.ingest",
  ],
  course_rep: ["download", "comment", "upload", "edit", "moderate", "admin.view_submissions", "material.ingest"],
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
    "material.ingest",
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
    "material.ingest",
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
    "material.ingest",
    "material.review_gifts",
    "mail.send_user",
    "mail.broadcast",
    "survey.manage",
    "material.drive_inbox",
    "economy.manage",
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
    "material.ingest",
    "material.review_gifts",
    "mail.send_user",
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
    "material.ingest",
    "material.review_gifts",
    "mail.send_user",
    "mail.broadcast",
    "survey.manage",
    "material.drive_inbox",
    "economy.manage",
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
