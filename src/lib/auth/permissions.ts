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
  | "assign_role";

const PERMISSIONS: Record<UserRole, Action[]> = {
  student: ["download", "comment", "upload"],
  collaborator: ["download", "comment", "upload", "edit"],
  auditor: ["download", "comment", "upload", "edit", "moderate", "audit"],
  course_rep: ["download", "comment", "upload", "edit", "moderate"],
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
