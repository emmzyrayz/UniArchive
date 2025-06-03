// components/RouteProtectionProvider.tsx - Automatic route protection
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/userContext';
import { useAuth } from '@/context/authContext';
import { getRouteProtection } from '@/config/routeProtection';

interface RouteProtectionProviderProps {
  children: React.ReactNode;
}

const RouteProtectionProvider: React.FC<RouteProtectionProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // Auth context only for authentication state
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // User context for session and profile data
  const { 
    userProfile, 
    hasActiveSession, 
    isLoading: userLoading, 
    userState,
    refreshUserData,
    clearUserData 
  } = useUser();
  
  const [hasCheckedRoute, setHasCheckedRoute] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Get protection config for current route
  const routeProtection = getRouteProtection(pathname);

  // Combined loading state check
  const isLoading = authLoading || userLoading || isInitializing;

  // Handle authentication changes - sync contexts
  const handleAuthChange = useCallback(async () => {
    console.log('Auth state changed:', { isAuthenticated, hasActiveSession });
    
    if (isAuthenticated && !hasActiveSession) {
      // User just logged in, refresh user data
      console.log('User authenticated, refreshing user data...');
      await refreshUserData();
    } else if (!isAuthenticated && hasActiveSession) {
      // User logged out, clear user data
      console.log('User logged out, clearing user data...');
      clearUserData();
    }
  }, [isAuthenticated, hasActiveSession, refreshUserData, clearUserData]);

  // Sync authentication state changes
  useEffect(() => {
    handleAuthChange();
  }, [handleAuthChange]);

  // Initialize route protection
  useEffect(() => {
    const initializeProtection = async () => {
      console.log('Initializing route protection...');
      
      // Wait a bit for contexts to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsInitializing(false);
    };

    initializeProtection();
  }, []);

  // Main route protection logic
  useEffect(() => {
    console.log('Route protection check:', {
      pathname,
      isLoading,
      isAuthenticated,
      hasActiveSession,
      userRole: userProfile?.role,
      routeProtection,
      hasCheckedRoute,
      userState
    });

    // Don't check while loading
    if (isLoading) {
      setHasCheckedRoute(false);
      return;
    }

    // Skip if no protection needed
    if (!routeProtection) {
      console.log('No route protection needed for:', pathname);
      setHasCheckedRoute(true);
      return;
    }

    // Skip if already checked this route
    if (hasCheckedRoute) {
      return;
    }

    let shouldRedirect = false;
    let redirectPath = routeProtection.fallbackPath || '/auth/signin';

    // Check authentication requirement
    if (routeProtection.requiresAuth) {
      if (!isAuthenticated) {
        console.log('Authentication required but user not authenticated');
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/auth/signin';
      } else if (!hasActiveSession) {
        console.log('Authentication present but no active session');
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/auth/signin';
      }
    }

    // Check role requirements (only if authenticated with active session)
    if (
      !shouldRedirect &&
      routeProtection.requiredRoles && 
      routeProtection.requiredRoles.length > 0 && 
      isAuthenticated &&
      hasActiveSession
    ) {
      if (!userProfile) {
        // User is authenticated but profile not loaded yet, wait
        console.log('User authenticated with active session but profile loading...');
        return;
      }
      
      if (!routeProtection.requiredRoles.includes(userProfile.role)) {
        console.log('Role access denied:', {
          userRole: userProfile.role,
          requiredRoles: routeProtection.requiredRoles
        });
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/unauthorized';
      }
    }

    // Perform redirect if needed
    if (shouldRedirect) {
      console.log('Redirecting to:', redirectPath);
      router.push(redirectPath);
      return;
    }

    console.log('Route protection passed for:', pathname);
    setHasCheckedRoute(true);
  }, [
    pathname,
    isLoading,
    isAuthenticated,
    hasActiveSession,
    userProfile,
    routeProtection,
    router,
    hasCheckedRoute,
    userState
  ]);

  // Reset check when pathname changes
  useEffect(() => {
    console.log('Pathname changed to:', pathname);
    setHasCheckedRoute(false);
  }, [pathname]);

  // Loading screen
  if (isLoading && routeProtection?.requiresAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied for role-based restrictions
  if (
    routeProtection?.requiredRoles && 
    routeProtection.requiredRoles.length > 0 && 
    isAuthenticated && 
    hasActiveSession && 
    userProfile &&
    !routeProtection.requiredRoles.includes(userProfile.role) &&
    hasCheckedRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="text-red-600 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-2">
              You need <strong>{routeProtection.requiredRoles.join(' or ')}</strong> role to access this page.
            </p>
            <p className="text-sm text-red-500 mb-4">
              Your current role: <strong>{userProfile.role}</strong>
            </p>
            <div className="space-x-2">
              <button
                onClick={() => router.back()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No active session but authenticated (session expired)
  if (
    routeProtection?.requiresAuth &&
    isAuthenticated &&
    !hasActiveSession &&
    hasCheckedRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <div className="text-yellow-600 text-6xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Session Expired</h2>
            <p className="text-yellow-600 mb-4">
              Your session has expired. Please sign in again to continue.
            </p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteProtectionProvider;