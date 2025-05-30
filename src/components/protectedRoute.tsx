// components/RouteProtectionProvider.tsx - Automatic route protection
"use client";

import React, { useEffect } from 'react';
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
  const { isAuthenticated, isLoading } = useAuth();
  const { userProfile, hasActiveSession } = useUser();

  // Get protection config for current route
  const routeProtection = getRouteProtection(pathname);

   // Handle redirects in useEffect to avoid render-time navigation
  useEffect(() => {
    // Don't redirect while loading or if no protection is needed
    if (isLoading || !routeProtection) return;

    // Check authentication requirement
    if (routeProtection.requiresAuth && (!isAuthenticated || !hasActiveSession)) {
      router.push(routeProtection.fallbackPath || '/auth/signin');
      return;
    }

    // Check role requirements - only redirect if user has profile but wrong role
    if (
      routeProtection.requiredRoles && 
      routeProtection.requiredRoles.length > 0 && 
      userProfile && 
      !routeProtection.requiredRoles.includes(userProfile.role)
    ) {
      router.push(routeProtection.fallbackPath || '/unauthorized');
      return;
    }
  }, [
    pathname,
    isLoading,
    isAuthenticated,
    hasActiveSession,
    userProfile,
    routeProtection,
    router
  ]);

   // Show loading state
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
  //         <p className="mt-4 text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // If no protection config, render children normally
  if (!routeProtection) {
    return <>{children}</>;
  }

  // Check authentication requirement - show loading instead of redirecting
  if (routeProtection.requiresAuth && (!isAuthenticated || !hasActiveSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Check role requirements - show access denied UI instead of redirecting
  if (routeProtection.requiredRoles && routeProtection.requiredRoles.length > 0 && userProfile) {
    if (!routeProtection.requiredRoles.includes(userProfile.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600 mb-4">
                You need {routeProtection.requiredRoles.join(' or ')} role to access this page.
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Go Back
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // If user profile is still loading but auth is complete, show loading
  if (routeProtection.requiredRoles && routeProtection.requiredRoles.length > 0 && !userProfile && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }


  return <>{children}</>;
};

export default RouteProtectionProvider;