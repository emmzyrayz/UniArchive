// hooks/useRouteProtection.ts - Hook for programmatic route protection checks
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/userContext';
import { getRouteProtection, canUserAccessRoute, type UserRole } from '@/config/routeProtection';

export interface RouteProtectionState {
  // Current route info
  currentPath: string;
  routeProtection: ReturnType<typeof getRouteProtection>;
  
  // Access states
  canAccess: boolean;
  requiresAuth: boolean;
  hasRequiredRole: boolean;
  
  // User info
  isAuthenticated: boolean;
  userRole: UserRole | null;
  
  // Loading states
  isLoading: boolean;
  isCheckingAccess: boolean;
  
  // Reasons for access denial
  accessDenialReason: 'none' | 'not_authenticated' | 'insufficient_role' | 'loading';
}

/**
 * Hook to check route protection status and access permissions
 * Works seamlessly with the updated userContext
 */
export const useRouteProtection = (customPath?: string): RouteProtectionState => {
  const pathname = usePathname();
  const targetPath = customPath || pathname;
  
  const {
    userProfile,
    hasActiveSession,
    isLoading: userLoading,
    userState
  } = useUser();

  const routeProtection = useMemo(() => {
    return getRouteProtection(targetPath);
  }, [targetPath]);

  const state = useMemo((): RouteProtectionState => {
    const isAuthenticated = hasActiveSession;
    const userRole = userProfile?.role || null;
    const isLoading = userLoading || userState === 'loading' || userState === 'initializing';
    
    // If still loading, can't determine access yet
    if (isLoading) {
      return {
        currentPath: targetPath,
        routeProtection,
        canAccess: false,
        requiresAuth: routeProtection?.requiresAuth || false,
        hasRequiredRole: false,
        isAuthenticated,
        userRole,
        isLoading: true,
        isCheckingAccess: true,
        accessDenialReason: 'loading'
      };
    }

    // No protection needed - public route
    if (!routeProtection) {
      return {
        currentPath: targetPath,
        routeProtection: null,
        canAccess: true,
        requiresAuth: false,
        hasRequiredRole: true,
        isAuthenticated,
        userRole,
        isLoading: false,
        isCheckingAccess: false,
        accessDenialReason: 'none'
      };
    }

    // Check authentication requirement
    if (routeProtection.requiresAuth && !isAuthenticated) {
      return {
        currentPath: targetPath,
        routeProtection,
        canAccess: false,
        requiresAuth: true,
        hasRequiredRole: false,
        isAuthenticated,
        userRole,
        isLoading: false,
        isCheckingAccess: false,
        accessDenialReason: 'not_authenticated'
      };
    }

    // Check role requirements
    let hasRequiredRole = true;
    if (routeProtection.requiredRoles && routeProtection.requiredRoles.length > 0) {
      hasRequiredRole = userRole ? routeProtection.requiredRoles.includes(userRole) : false;
    }

    const canAccess = (!routeProtection.requiresAuth || isAuthenticated) && hasRequiredRole;

    return {
      currentPath: targetPath,
      routeProtection,
      canAccess,
      requiresAuth: routeProtection.requiresAuth,
      hasRequiredRole,
      isAuthenticated,
      userRole,
      isLoading: false,
      isCheckingAccess: false,
      accessDenialReason: !canAccess 
        ? (!isAuthenticated ? 'not_authenticated' : 'insufficient_role')
        : 'none'
    };
  }, [targetPath, routeProtection, hasActiveSession, userProfile, userLoading, userState]);

  return state;
};

/**
 * Simplified hook to just check if user can access a specific route
 */
export const useCanAccessRoute = (path: string): boolean => {
  const { canAccess, isLoading } = useRouteProtection(path);
  return !isLoading && canAccess;
};

/**
 * Hook to get user's accessible routes from a list
 */
export const useAccessibleRoutes = (routes: string[]): string[] => {
  const { userProfile, hasActiveSession, isLoading } = useUser();
  
  return useMemo(() => {
    if (isLoading) return [];
    
    return routes.filter(route => 
      canUserAccessRoute(route, userProfile?.role, hasActiveSession)
    );
  }, [routes, userProfile?.role, hasActiveSession, isLoading]);
};