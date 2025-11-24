// components/RouteProtectionProvider.tsx - Fixed version with better error handling
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

// Enhanced URL mapping storage with better error handling and graceful fallback
class URLMappingStorage {
  private inMemoryStorage: { [key: string]: string } = {};
  private storageAvailable: boolean | null = null;

  private checkStorageAvailability(): boolean {
    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }

    if (typeof window === 'undefined') {
      this.storageAvailable = false;
      return false;
    }

    try {
      const testKey = '__session_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch (error) {
      console.warn('RouteProtection: sessionStorage not available, using in-memory storage:', error);
      this.storageAvailable = false;
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.checkStorageAvailability()) {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.warn('RouteProtection: sessionStorage read failed, falling back to in-memory storage:', error);
      }
    }
    return this.inMemoryStorage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.checkStorageAvailability()) {
      try {
        sessionStorage.setItem(key, value);
        // Also store in memory as backup
        this.inMemoryStorage[key] = value;
        return;
      } catch (error) {
        console.warn('RouteProtection: sessionStorage write failed, using in-memory storage:', error);
      }
    }
    this.inMemoryStorage[key] = value;
  }

  removeItem(key: string): void {
    if (this.checkStorageAvailability()) {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn('RouteProtection: sessionStorage remove failed:', error);
      }
    }
    delete this.inMemoryStorage[key];
  }

  clear(): void {
    if (this.checkStorageAvailability()) {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn('RouteProtection: sessionStorage clear failed:', error);
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
  const [routeCheckAttempts, setRouteCheckAttempts] = useState(0);
  
  // Use refs to track state changes and prevent stale closures
  const userStateRef = useRef(userState);
  const hasActiveSessionRef = useRef(hasActiveSession);
  const userProfileRef = useRef(userProfile);
  const routeCheckedRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAttemptRef = useRef(false);

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

  // Enhanced loading state logic with better timing
  const isLoading = useMemo(() => {
    // Don't show loading for public routes unless we're initializing
    if (isPublicRoute && !isInitializing) return false;
    
    // Show loading if user context is loading, we're initializing, or in loading/initializing state
    const shouldLoad = userLoading || 
                      isInitializing || 
                      userState === UserState.LOADING || 
                      userState === UserState.INITIALIZING;
    
    // For protected routes, also consider if we haven't checked yet
    if (routeProtection?.requiresAuth && !hasCheckedRoute && !shouldLoad) {
      return userState !== UserState.ACTIVE_SESSION && userState !== UserState.NO_SESSION;
    }
    
    return shouldLoad;
  }, [userLoading, isInitializing, userState, isPublicRoute, routeProtection, hasCheckedRoute]);

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

  // Enhanced initialization with timeout fallback
  useEffect(() => {
    const initializeProtection = async () => {
      console.log('RouteProtection: Starting initialization...');
      
      // Set a maximum initialization timeout (30 seconds instead of 10)
      initializationTimeoutRef.current = setTimeout(() => {
        console.log('RouteProtection: Initialization timeout reached, proceeding...');
        if (isInitializing) {
          setIsInitializing(false);
          setShouldShowLoading(false);
        }
      }, 30000); // Increased to 30 seconds for slower networks
      
      // Wait for user context to stabilize (increased timeout)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased from 300ms
      
      // Clear timeout if initialization completes normally
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      console.log('RouteProtection: Initialization completed');
      setIsInitializing(false);
    };
    
    initializeProtection();
    
    // Cleanup timeout on unmount
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitializing]);

  // Reset route check when pathname changes
  useEffect(() => {
    if (pathname !== lastCheckedPath) {
      console.log(`RouteProtection: Path changed from ${lastCheckedPath} to ${pathname}`);
      setHasCheckedRoute(false);
      setShouldShowLoading(true);
      setLastCheckedPath(pathname);
      setRouteCheckAttempts(0);
      routeCheckedRef.current = false;
      refreshAttemptRef.current = false;
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
      shouldShowLoading,
      routeCheckAttempts
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
  }, [pathname, routeProtection, userLoading, isInitializing, isLoading, hasCheckedRoute, shouldShowLoading, routeCheckAttempts, isAuthRoute, isPublicRoute, getIntendedURL]);

  // Enhanced route protection logic with retry mechanism and better error handling
  const checkRouteAccess = useCallback(async () => {
    // Skip if already checked or if we're on auth routes
    if (hasCheckedRoute || isAuthRoute || routeCheckedRef.current) {
      return;
    }

    // Skip if still loading or initializing
    if (isLoading && isInitializing) {
      return;
    }

    // Prevent infinite loops by limiting attempts
    if (routeCheckAttempts >= 5) {
      console.log('RouteProtection: Max route check attempts reached, allowing access');
      setHasCheckedRoute(true);
      setShouldShowLoading(false);
      routeCheckedRef.current = true;
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

    // Authentication check with improved logic
    if (routeProtection.requiresAuth) {
      console.log('🔐 Checking authentication requirement...');
      
      // If user state is still initializing and we haven't waited long enough, wait more
      if (userStateRef.current === UserState.INITIALIZING && routeCheckAttempts < 3) {
        console.log('⏳ User state still initializing, waiting... (attempt', routeCheckAttempts + 1, ')');
        setRouteCheckAttempts(prev => prev + 1);
        
        // Retry after a delay
        setTimeout(() => {
          checkRouteAccess();
        }, 2000); // Wait 2 seconds before retry
        return;
      }

      // Handle different user states
      if (userStateRef.current === UserState.NO_SESSION) {
        console.log('❌ No active session confirmed, redirecting to auth');
        shouldRedirect = true;
        redirectPath = '/auth/signin';
      }
      else if (userStateRef.current === UserState.ERROR) {
        console.log('💥 User state error detected');
        
        // Only attempt refresh once per route check
        if (!refreshAttemptRef.current && routeCheckAttempts < 2) {
          console.log('🔄 Attempting to refresh user data due to error state...');
          refreshAttemptRef.current = true;
          setRouteCheckAttempts(prev => prev + 1);
          
          try {
            const refreshed = await refreshUserData();
            if (!refreshed) {
              console.log('❌ Refresh failed, redirecting to auth');
              shouldRedirect = true;
              redirectPath = '/auth/signin';
            } else {
              console.log('✅ Refresh successful, retrying route check');
              // Don't set hasCheckedRoute yet, let it retry
              setTimeout(() => {
                checkRouteAccess();
              }, 1000);
              return;
            }
          } catch (error) {
            console.error('💥 Error during refresh:', error);
            // Don't immediately redirect on network errors
            if (routeCheckAttempts >= 2) {
              shouldRedirect = true;
              redirectPath = '/auth/signin';
            } else {
              setRouteCheckAttempts(prev => prev + 1);
              setTimeout(() => {
                checkRouteAccess();
              }, 3000); // Wait longer on error
              return;
            }
          }
        } else {
          // If we've already attempted refresh or tried multiple times, allow with warning
          console.log('⚠️ Multiple error states detected, allowing access with degraded experience');
          setHasCheckedRoute(true);
          setShouldShowLoading(false);
          routeCheckedRef.current = true;
          return;
        }
      }
      else if (!hasActiveSessionRef.current && userStateRef.current !== UserState.ACTIVE_SESSION) {
        console.log('❌ No active session, redirecting to auth');
        shouldRedirect = true;
        redirectPath = '/auth/signin';
      }
      else if (hasActiveSessionRef.current && !userProfileRef.current) {
        // If we have a session but no user profile yet, try refreshing ONCE
        if (!refreshAttemptRef.current && routeCheckAttempts < 2) {
          console.log('🔄 Active session without profile, attempting single refresh...');
          refreshAttemptRef.current = true;
          setRouteCheckAttempts(prev => prev + 1);
          
          try {
            const refreshed = await refreshUserData();
            if (!refreshed) {
              console.log('❌ Refresh failed, redirecting to auth');
              shouldRedirect = true;
              redirectPath = '/auth/signin';
            } else {
              console.log('✅ Refresh successful, retrying route check');
              // Don't set hasCheckedRoute yet, let it retry
              setTimeout(() => {
                checkRouteAccess();
              }, 1000);
              return;
            }
          } catch (error) {
            console.error('💥 Error during refresh:', error);
            shouldRedirect = true;
            redirectPath = '/auth/signin';
          }
        } else {
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
  }, [hasCheckedRoute, isAuthRoute, isLoading, isInitializing, routeProtection, refreshUserData, logDetailedState, redirectToSignin, pathname, router, routeCheckAttempts]);

  // Run route check when dependencies change
  useEffect(() => {
    // Add debouncing to prevent too frequent checks
    const timeoutId = setTimeout(() => {
      checkRouteAccess();
    }, 200); // 200ms debounce

    return () => clearTimeout(timeoutId);
  }, [checkRouteAccess, userState, hasActiveSession, userProfile]);

  // Handle specific user state transitions with better timing
  useEffect(() => {
    if (userState === UserState.ACTIVE_SESSION && !hasCheckedRoute && !isAuthRoute) {
      console.log('🔄 User session became active, checking for redirects and rechecking route');
      
      // Check if we need to redirect to intended URL
      const redirected = handleAuthSuccessRedirect();
      
      if (!redirected) {
        // Reset route check state and recheck
        setHasCheckedRoute(false);
        routeCheckedRef.current = false;
        refreshAttemptRef.current = false;
        
        // Small delay to ensure state has propagated
        setTimeout(() => {
          checkRouteAccess();
        }, 500); // Increased delay for better reliability
      }
    }
  }, [userState, hasCheckedRoute, isAuthRoute, checkRouteAccess, handleAuthSuccessRedirect]);

  // Enhanced session state change handler
  const handleSessionStateChange = useCallback(async () => {
    // Only handle errors on protected routes
    if (userState === UserState.ERROR && routeProtection?.requiresAuth && !isAuthRoute) {
      console.log('💥 User state error on protected route');
      
      // Don't immediately redirect - let the route check handle it with retries
      if (!hasCheckedRoute) {
        console.log('🔄 Route not checked yet, will be handled by route check');
        return;
      }
      
      // If route was already checked and we get an error, try one refresh
      if (!refreshAttemptRef.current) {
        console.log('🔄 Attempting refresh due to error state');
        refreshAttemptRef.current = true;
        
        try {
          const refreshed = await refreshUserData();
          if (!refreshed) {
            console.log('❌ Refresh failed on error state, redirecting to signin');
            redirectToSignin(pathname);
          }
        } catch (error) {
          console.error('💥 Refresh error in session state handler:', error);
          // Don't redirect immediately on network errors
        }
      }
    }
  }, [userState, routeProtection, refreshUserData, isAuthRoute, hasCheckedRoute, redirectToSignin, pathname]);

  useEffect(() => {
    // Debounce session state changes
    const timeoutId = setTimeout(() => {
      handleSessionStateChange();
    }, 1000);

    return () => clearTimeout(timeoutId);
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

  // Show loading state for protected routes with better conditions
  if (shouldShowLoading && (isLoading || (!hasCheckedRoute && routeCheckAttempts < 5))) {
    console.log('⏳ Showing loading state', {
      shouldShowLoading,
      isLoading,
      hasCheckedRoute,
      userState,
      routeCheckAttempts
    });
    return <Loading />;
  }

  // Access denied scenarios with enhanced logging and better error handling
  if (!isLoading && (hasCheckedRoute || routeCheckAttempts >= 5)) {
    // If we need auth but don't have an active session
    if (routeProtection.requiresAuth && !hasActiveSession && userState !== UserState.ERROR) {
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

    // If we're in an error state, show error message instead of infinite loading
    if (userState === UserState.ERROR && routeProtection.requiresAuth) {
      console.log('🚫 Error state on protected route');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
            <p className="mb-4">Unable to verify your session. Please try again.</p>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
              <button 
                onClick={() => redirectToSignin(pathname)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  console.log('🎯 Rendering children - all checks passed or fallback reached');
  return <>{children}</>;
};

export default RouteProtectionProvider;