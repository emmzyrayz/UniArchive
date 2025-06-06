// components/RouteProtectionProvider.tsx - Updated with URL mapping and no periodic checks
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/userContext';
import { getRouteProtection } from '@/config/routeProtection';
import { Loading } from './reuse/loading';
import { UserState } from '@/context/userContext';

interface RouteProtectionProviderProps {
  children: React.ReactNode;
}

// Extend Window interface to include our custom property
declare global {
  interface Window {
    handleAuthSuccessRedirect?: () => boolean;
  }
}

// URL mapping storage (in-memory)
class URLMappingStorage {
  private inMemoryStorage: { [key: string]: string } = {};

  getItem(key: string): string | null {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.warn('sessionStorage access failed, using in-memory storage:', error);
        return this.inMemoryStorage[key] || null;
      }
    }
    return this.inMemoryStorage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(key, value);
        return;
      } catch (error) {
        console.warn('sessionStorage write failed, using in-memory storage:', error);
      }
    }
    this.inMemoryStorage[key] = value;
  }

  removeItem(key: string): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn('sessionStorage remove failed:', error);
      }
    }
    delete this.inMemoryStorage[key];
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn('sessionStorage clear failed:', error);
      }
    }
    this.inMemoryStorage = {};
  }
}

const urlMappingStorage = new URLMappingStorage();

const RouteProtectionProvider: React.FC<RouteProtectionProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // User context
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
  const [shouldShowLoading, setShouldShowLoading] = useState(true);
  
  // Use refs to track state changes and prevent stale closures
  const userStateRef = useRef(userState);
  const hasActiveSessionRef = useRef(hasActiveSession);
  const userProfileRef = useRef(userProfile);
  const routeCheckedRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    userStateRef.current = userState;
    hasActiveSessionRef.current = hasActiveSession;
    userProfileRef.current = userProfile;
  }, [userState, hasActiveSession, userProfile]);

  // Memoize route protection to prevent unnecessary recalculations
  const routeProtection = useMemo(() => getRouteProtection(pathname), [pathname]);

  // Check if current route is an auth route
  const isAuthRoute = useMemo(() => 
    ['/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password'].includes(pathname),
    [pathname]
  );

  // Check if route is public (doesn't require authentication)
  const isPublicRoute = useMemo(() => {
    const publicRoutes = ['/', '/schools', '/about', '/contact'];
    return publicRoutes.some(route => pathname.startsWith(route)) || isAuthRoute;
  }, [pathname, isAuthRoute]);

  // Combined loading state - be more selective about when to show loading
  const isLoading = useMemo(() => {
    // Don't show loading for public routes unless we're initializing
    if (isPublicRoute && !isInitializing) return false;
    
    // Show loading if user context is loading or if we're in loading/initializing state
    return userLoading || 
           isInitializing || 
           userState === UserState.LOADING || 
           userState === UserState.INITIALIZING;
  }, [userLoading, isInitializing, userState, isPublicRoute]);

  // URL mapping functions
  const saveIntendedURL = useCallback((url: string) => {
    console.log(`RouteProtection: Saving intended URL: ${url}`);
    urlMappingStorage.setItem('intendedURL', url);
  }, []);

  const getIntendedURL = useCallback((): string | null => {
    return urlMappingStorage.getItem('intendedURL');
  }, []);

  const clearIntendedURL = useCallback(() => {
    urlMappingStorage.removeItem('intendedURL');
  }, []);

  // Function to redirect to signin with URL mapping
  const redirectToSignin = useCallback((currentPath: string) => {
    // Don't save auth routes as intended URLs
    if (!isAuthRoute && currentPath !== '/auth/signin') {
      saveIntendedURL(currentPath);
    }
    console.log(`RouteProtection: Redirecting to signin from ${currentPath}`);
    router.push('/auth/signin');
  }, [isAuthRoute, saveIntendedURL, router]);

  // Function to handle successful authentication redirect
  const handleAuthSuccessRedirect = useCallback(() => {
    const intendedURL = getIntendedURL();
    if (intendedURL && intendedURL !== pathname) {
      console.log(`RouteProtection: Redirecting to intended URL: ${intendedURL}`);
      clearIntendedURL();
      router.push(intendedURL);
      return true;
    }
    return false;
  }, [getIntendedURL, clearIntendedURL, router, pathname]);

  // Initialize route protection
  useEffect(() => {
    const initializeProtection = async () => {
      // Give a moment for user context to initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsInitializing(false);
    };
    initializeProtection();
  }, []);

  // Reset route check when pathname changes
  useEffect(() => {
    if (pathname !== lastCheckedPath) {
      console.log(`RouteProtection: Path changed from ${lastCheckedPath} to ${pathname}`);
      setHasCheckedRoute(false);
      setShouldShowLoading(true);
      setLastCheckedPath(pathname);
      routeCheckedRef.current = false;
    }
  }, [pathname, lastCheckedPath]);

  // ENHANCED DEBUG LOGGING FUNCTION
  const logDetailedState = useCallback(() => {
    console.log('🔍 DETAILED ROUTE PROTECTION STATE:');
    console.log('================================================');
    console.log('📍 Current Path:', pathname);
    console.log('🔐 Route Protection Config:', routeProtection);
    console.log('👤 User State:', userStateRef.current);
    console.log('🔑 Has Active Session:', hasActiveSessionRef.current);
    console.log('👨‍💼 User Profile:', {
      exists: !!userProfileRef.current,
      fullName: userProfileRef.current?.fullName,
      role: userProfileRef.current?.role,
      email: userProfileRef.current?.email,
      isVerified: userProfileRef.current?.isVerified
    });
    console.log('⚡ Loading States:', {
      userLoading,
      isInitializing,
      isLoading,
      hasCheckedRoute,
      shouldShowLoading
    });
    console.log('🎯 Route Checks:', {
      isAuthRoute,
      isPublicRoute,
      routeRequiresAuth: routeProtection?.requiresAuth,
      requiredRoles: routeProtection?.requiredRoles
    });
    console.log('🔗 URL Mapping:', {
      intendedURL: getIntendedURL(),
      currentPath: pathname
    });
    console.log('================================================');
  }, [pathname, routeProtection, userLoading, isInitializing, isLoading, hasCheckedRoute, shouldShowLoading, isAuthRoute, isPublicRoute, getIntendedURL]);

  // Main route protection logic with improved state handling
  const checkRouteAccess = useCallback(async () => {
    // Skip if already checked or if we're on auth routes
    if (hasCheckedRoute || isAuthRoute || routeCheckedRef.current) {
      return;
    }

    // Skip if still loading or initializing
    if (isLoading) {
      return;
    }

    // Enhanced logging
    logDetailedState();

    // If no protection needed, allow access
    if (!routeProtection) {
      console.log('✅ RouteProtection: No protection needed, allowing access');
      setHasCheckedRoute(true);
      setShouldShowLoading(false);
      routeCheckedRef.current = true;
      return;
    }

    let shouldRedirect = false;
    let redirectPath = '/auth/signin'; // Default fallback

    // Authentication check
    if (routeProtection.requiresAuth) {
      console.log('🔐 Checking authentication requirement...');
      
      // If user state is still initializing, wait a bit more
      if (userStateRef.current === UserState.INITIALIZING) {
        console.log('⏳ User state still initializing, waiting...');
        return;
      }

      // If no active session and user state is settled
      if (!hasActiveSessionRef.current && 
          (userStateRef.current === UserState.NO_SESSION || userStateRef.current === UserState.ERROR)) {
        console.log('❌ No active session, redirecting to auth');
        shouldRedirect = true;
        redirectPath = '/auth/signin';
      }
      
      // If we have a session but no user profile yet, try refreshing ONCE
      else if (hasActiveSessionRef.current && !userProfileRef.current) {
        console.log('🔄 Active session without profile, attempting single refresh...');
        try {
          const refreshed = await refreshUserData();
          if (!refreshed) {
            console.log('❌ Refresh failed, redirecting to auth');
            shouldRedirect = true;
            redirectPath = '/auth/signin';
          } else {
            console.log('✅ Refresh successful, retrying route check');
            // Don't set hasCheckedRoute yet, let it retry
            return;
          }
        } catch (error) {
          console.error('💥 Error during refresh:', error);
          shouldRedirect = true;
          redirectPath = '/auth/signin';
        }
      } else {
        console.log('✅ Authentication check passed');
      }
    }

    // Role-based check with enhanced debugging
    if (!shouldRedirect && 
        routeProtection.requiredRoles?.length && 
        hasActiveSessionRef.current && 
        userProfileRef.current) {
      
      const currentUserProfile = userProfileRef.current;
      console.log('🎭 Checking role requirements...');
      console.log('🔍 Role Check Details:', {
        userRole: currentUserProfile.role,
        userRoleType: typeof currentUserProfile.role,
        requiredRoles: routeProtection.requiredRoles,
        requiredRolesTypes: routeProtection.requiredRoles.map(r => typeof r),
        includes: routeProtection.requiredRoles.includes(currentUserProfile.role),
        strictEquality: routeProtection.requiredRoles.some(role => role === currentUserProfile.role)
      });
      
      // Check with both includes and manual comparison for debugging
      const hasRequiredRole = routeProtection.requiredRoles.includes(userProfileRef.current.role);
      
      if (!hasRequiredRole) {
        console.log('❌ Insufficient role, checking fallback...');
        console.log('🔄 Fallback path:', routeProtection.fallbackPath);
        shouldRedirect = true;
        redirectPath = routeProtection.fallbackPath || '/unauthorized';
      } else {
        console.log('✅ Role check passed');
      }
    }

    // Perform redirect if needed with URL mapping
    if (shouldRedirect) {
      console.log(`🚀 Redirecting to ${redirectPath}`);
      if (redirectPath === '/auth/signin') {
        redirectToSignin(pathname);
      } else {
        router.push(redirectPath);
      }
      return;
    }

    // If we get here, access is granted
    console.log('🎉 ACCESS GRANTED - All checks passed!');
    setHasCheckedRoute(true);
    setShouldShowLoading(false);
    routeCheckedRef.current = true;
  }, [hasCheckedRoute, isAuthRoute, isLoading, routeProtection, refreshUserData, logDetailedState, redirectToSignin, pathname, router]);

  // Run route check when dependencies change
  useEffect(() => {
    checkRouteAccess();
  }, [checkRouteAccess, userState, hasActiveSession, userProfile]);

  // Handle specific user state transitions
  useEffect(() => {
    if (userState === UserState.ACTIVE_SESSION && !hasCheckedRoute && !isAuthRoute) {
      console.log('🔄 User session became active, rechecking route and checking for redirects');
      
      // Check if we need to redirect to intended URL
      const redirected = handleAuthSuccessRedirect();
      
      if (!redirected) {
        // Small delay to ensure state has propagated
        setTimeout(() => {
          checkRouteAccess();
        }, 100);
      }
    }
  }, [userState, hasCheckedRoute, isAuthRoute, checkRouteAccess, handleAuthSuccessRedirect]);

  // Handle session state changes and errors
  const handleSessionStateChange = useCallback(async () => {
    if (userState === UserState.ERROR && routeProtection?.requiresAuth && !isAuthRoute) {
      console.log('💥 User state error on protected route, attempting single refresh');
      const refreshed = await refreshUserData();
      if (!refreshed) {
        console.log('❌ Refresh failed, redirecting to signin');
        redirectToSignin(pathname);
      }
    }
  }, [userState, routeProtection, refreshUserData, isAuthRoute, redirectToSignin, pathname]);

  useEffect(() => {
    handleSessionStateChange();
  }, [handleSessionStateChange]);

  // Expose redirect function globally for auth components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.handleAuthSuccessRedirect = handleAuthSuccessRedirect;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.handleAuthSuccessRedirect;
      }
    };
  }, [handleAuthSuccessRedirect]);

  // Early return for auth routes - they handle their own logic
  if (isAuthRoute) {
    console.log('🔓 Auth route, allowing access');
    return <>{children}</>;
  }

  // Early return for public routes that don't need protection
  if (!routeProtection) {
    console.log('🌐 Public route, allowing access');
    return <>{children}</>;
  }

  // Show loading state for protected routes
  if (shouldShowLoading && (isLoading || !hasCheckedRoute)) {
    console.log('⏳ Showing loading state', {
      shouldShowLoading,
      isLoading,
      hasCheckedRoute,
      userState
    });
    return <Loading />;
  }

  // Access denied scenarios with enhanced logging
  if (!isLoading && hasCheckedRoute) {
    // If we need auth but don't have an active session
    if (routeProtection.requiresAuth && !hasActiveSession) {
      console.log('🚫 Access denied - no session');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-4">Please sign in to access this page.</p>
            <button 
              onClick={() => redirectToSignin(pathname)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sign In
            </button>
          </div>
        </div>
      );
    }

    // If we have a session but don't meet role requirements
    if (routeProtection.requiredRoles?.length && 
        hasActiveSession && 
        userProfile && 
        !routeProtection.requiredRoles.includes(userProfile.role)) {
      console.log('🚫 Access denied - insufficient role');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="mb-4">You don&apos;t have permission to access this page.</p>
            <div className="text-sm text-gray-600 mb-4 p-4 bg-gray-100 rounded">
              <p><strong>Required roles:</strong> {routeProtection.requiredRoles.join(', ')}</p>
              <p><strong>Your role:</strong> {userProfile.role}</p>
              <p><strong>Role type:</strong> {typeof userProfile.role}</p>
              <p><strong>Role check result:</strong> {routeProtection.requiredRoles.includes(userProfile.role) ? 'PASS' : 'FAIL'}</p>
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  console.log('🎯 Rendering children - all checks passed');
  return <>{children}</>;
};

export default RouteProtectionProvider;