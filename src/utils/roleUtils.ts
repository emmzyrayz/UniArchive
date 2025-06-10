// utils/roleUtils.ts - Helper utilities for role management
export type UserRole = "admin" | "contributor" | "student" | "mod" | "devsupport";

export const roleHierarchy: Record<UserRole, number> = {
  student: 1,
  contributor: 2,
  mod: 3,
  devsupport: 4,
  admin: 5,
};

export const hasHigherOrEqualRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canPerformAction = (
  userRole: UserRole, 
  action: 'upload' | 'moderate' | 'admin' | 'delete' | 'edit'
): boolean => {
  const permissions = {
    upload: ['student', 'contributor', 'mod', 'admin'],
    moderate: ['mod', 'admin'],
    admin: ['admin'],
    delete: ['mod', 'admin'],
    edit: ['contributor', 'mod', 'admin'],
  };
  
  return permissions[action].includes(userRole);
};