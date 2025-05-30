// hooks/usePermissions.ts - Custom hook for permission checking
import { useUser } from '@/context/userContext';
import { canPerformAction, hasHigherOrEqualRole, UserRole } from '@/utils/roleUtils';

export const usePermissions = () => {
  const { userProfile, userPermissions } = useUser();

  const checkPermission = (action: 'upload' | 'moderate' | 'admin' | 'delete' | 'edit'): boolean => {
    if (!userProfile) return false;
    return canPerformAction(userProfile.role, action);
  };

  const checkRoleLevel = (requiredRole: UserRole): boolean => {
    if (!userProfile) return false;
    return hasHigherOrEqualRole(userProfile.role, requiredRole);
  };

  return {
    ...userPermissions,
    checkPermission,
    checkRoleLevel,
    userRole: userProfile?.role || 'student',
  };
};