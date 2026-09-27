// src/lib/constants/roles.ts
// Role-assignment rules shared by the admin users API and page.
import { roleHierarchy, type UserRole } from "@/types/roles";

/** Roles an admin can assign in the panel. webmaster and dev are database-only. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "student",
  "collaborator",
  "auditor",
  "course_rep",
  "lecturer",
  "ed_admin",
  "com_admin",
];

/** Roles that can't be changed or suspended through the API at all. */
export const PROTECTED_ROLES: UserRole[] = ["webmaster", "dev"];

/**
 * Admins only act on users ranked below themselves, so a com_admin can't
 * suspend or demote another com_admin. dev outranks everyone.
 */
export function outranks(actor: UserRole, target: UserRole): boolean {
  return roleHierarchy[actor] > roleHierarchy[target];
}
