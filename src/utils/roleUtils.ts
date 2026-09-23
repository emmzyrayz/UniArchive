// utils/roleUtils.ts
import { UserRole, roleHierarchy, hasHigherOrEqualRole } from "@/types/roles";

export { roleHierarchy, hasHigherOrEqualRole };
  export type { UserRole };

export const canPerformAction = (
  userRole: UserRole,
  action: "upload" | "moderate" | "admin" | "delete" | "edit",
): boolean => {
  const permissions: Record<typeof action, UserRole[]> = {
    upload: [
      "student",
      "collaborator",
      "auditor",
      "lecturer",
      "com_admin",
      "webmaster",
    ],
    moderate: ["auditor", "course_rep", "ed_admin", "com_admin", "webmaster"],
    admin: ["com_admin", "webmaster"],
    delete: ["ed_admin", "com_admin", "webmaster"],
    edit: [
      "collaborator",
      "auditor",
      "lecturer",
      "ed_admin",
      "com_admin",
      "webmaster",
    ],
  };

  return permissions[action].includes(userRole);
};