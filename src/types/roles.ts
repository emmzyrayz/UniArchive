// types/roles.ts
export type UserRole =
  | "student"
  | "collaborator"
  | "auditor"
  | "course_rep"
  | "lecturer"
  | "ed_admin"
  | "com_admin"
  | "webmaster"
  | "dev";

// Rough trust ordering for simple "does role A outrank role B" checks.
// This is approximate — com_admin/ed_admin/lecturer aren't strictly linear
// in real authority (they govern different domains), so don't rely on this
// for anything beyond coarse gating. Fine-grained permission checks should
// use explicit role lists, not a single numeric hierarchy.
export const roleHierarchy: Record<UserRole, number> = {
  student: 1,
  collaborator: 2,
  auditor: 3,
  course_rep: 4,
  lecturer: 5,
  ed_admin: 6,
  com_admin: 7,
  webmaster: 8,
  dev: 9,
};

export const hasHigherOrEqualRole = (
  userRole: UserRole,
  requiredRole: UserRole,
): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
