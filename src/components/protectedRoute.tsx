// components/RouteProtectionProvider.tsx - Streamlined route protection using userContext
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/userContext';
import { getRouteProtection } from '@/config/routeProtection';
import { Loading } from './reuse/loading';

interface RouteProtectionProviderProps {
  children: React.ReactNode;
}

const RouteProtectionProvider: React.FC<RouteProtectionProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // User context provides all needed state
  const { 
    userProfile, 
    hasActiveSession, 
    isLoading: userLoading, 
    userState,
    refreshUserData 
  } = useUser();
  
  const [hasCheckedRoute, setHasCheckedRoute] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastCheckedPath, setLastCheckedPath] = useState<string>('');

  // Get protection config for current route
  const routeProtection = getRouteProtection(pathname);

  // Combined loading state check
  const isLoading = userLoading || isInitializing;

  // Initialize route protection
  useEffect(() => {
    const initializeProtection = async () => {
      console.log('RouteProtection: Initializing...');
      
      // Small delay to allow userContext to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsInitializing(false);
      console.log('RouteProtection: Initialization complete');
    };

    initializeProtection();
  }, []);

  // Reset check when pathname changes
  useEffect(() => {
    if (pathname !== lastCheckedPath) {
      console.log('RouteProtection: Pathname changed from', lastCheckedPath, 'to', pathname);
      setHasCheckedRoute(false);
      setLastCheckedPath(pathname);
    }
  }, [pathname, lastCheckedPath]);

  // Main route protection logic
  useEffect(() => {
    console.log('RouteProtection: Protection check:', {
      pathname,
      isLoading,
      hasActiveSession,
      userRole: userProfile?.role,
      userState,
      routeProtection,
      hasCheckedRoute
    });

    // Don't check while loading or if already checked this route
    if (isLoading || hasCheckedRoute) {
      return;
    }

    // Skip if no protection needed
    if (!routeProtection) {
      console.log('RouteProtection: No protection needed for:', pathname);
      setHasCheckedRoute(true);
      return;
    }

    let shouldRedirect = false;
    let redirectPath = routeProtection.fallbackPath || '/auth/signin';

    // Check authentication requirement
    if (routeProtection.requiresAuth) {
      if (!hasActiveSession) {
        console.log('RouteProtection: Authentication required but no active session');
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/auth/signin';
      }
    }

    // Check role requirements (only if we have an active session)
    if (
      !shouldRedirect &&
      routeProtection.requiredRoles && 
      routeProtection.requiredRoles.length > 0 && 
      hasActiveSession
    ) {
      if (!userProfile) {
        // Active session but profile not loaded yet
        console.log('RouteProtection: Active session but profile still loading...');
        return; // Wait for profile to load
      }
      
      if (!routeProtection.requiredRoles.includes(userProfile.role)) {
        console.log('RouteProtection: Role access denied:', {
          userRole: userProfile.role,
          requiredRoles: routeProtection.requiredRoles
        });
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/unauthorized';
      }
    }

    // Perform redirect if needed
    if (shouldRedirect) {
      console.log('RouteProtection: Redirecting to:', redirectPath);
      router.push(redirectPath);
      return;
    }

    console.log('RouteProtection: Protection passed for:', pathname);
    setHasCheckedRoute(true);
  }, [
    pathname,
    isLoading,
    hasActiveSession,
    userProfile,
    routeProtection,
    router,
    hasCheckedRoute,
    userState
  ]);

  // Handle session state changes - refresh data if needed
  const handleSessionStateChange = useCallback(async () => {
    if (userState === 'error' && routeProtection?.requiresAuth) {
      console.log('RouteProtection: User state error, attempting refresh...');
      const refreshed = await refreshUserData();
      if (!refreshed) {
        console.log('RouteProtection: Refresh failed, redirecting to signin');
        router.push('/auth/signin');
      }
    }
  }, [userState, routeProtection, refreshUserData, router]);

  useEffect(() => {
    handleSessionStateChange();
  }, [handleSessionStateChange]);

  // Show loading screen for protected routes while initializing
  if (isLoading && routeProtection?.requiresAuth) {
    return <Loading />;
  }

  // Handle different access scenarios after loading is complete
  if (!isLoading && hasCheckedRoute) {
    // Role-based access denied
    if (
      routeProtection?.requiredRoles && 
      routeProtection.requiredRoles.length > 0 && 
      hasActiveSession && 
      userProfile &&
      !routeProtection.requiredRoles.includes(userProfile.role)
    ) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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

    // No active session for protected route
    if (routeProtection?.requiresAuth && !hasActiveSession) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-yellow-600 text-6xl mb-4">🔐</div>
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">Authentication Required</h2>
              <p className="text-yellow-600 mb-4">
                You need to sign in to access this page.
              </p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default RouteProtectionProvider;