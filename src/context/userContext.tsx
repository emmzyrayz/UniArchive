"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';


// User role type
type UserRole = "admin" | "contributor" | "student" | "mod" | "devsupport";

// Enhanced User interface - matches SessionCache data structure
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  school: string;
  faculty: string;
  department: string;
  uuid: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
  phone?: string;
  regNumber?: string;
  // Additional fields from SessionCache
  dob: Date;
  gender: 'Male' | 'Female' | 'Other';
  level: string;
}

// Enhanced Session information from SessionCache
interface SessionInfo {
  uuid: string;
  lastActivity: Date;
  expiresAt: Date;
  deviceInfo: string;
  ipAddress: string;
  signInTime: Date; // We'll derive this from the session creation
}

// User preferences and settings
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    showProfile: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
}

// Platform permissions based on user role
interface UserPermissions {
  canUpload: boolean;
  canDownload: boolean;
  canComment: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
}

// Navigation item interface
interface NavItem {
  name: string;
  path: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: UserRole[];
}

// User state enum - FIXED: Using string values that match your RouteProtection expectations
export enum UserState {
  INITIALIZING = 'initializing',
  ACTIVE_SESSION = 'active_session', 
  NO_SESSION = 'no_session',
  LOADING = 'loading',
  ERROR = 'error'
}

// Enhanced User context interface - FIXED: userState type matches the enum
interface UserContextType {
  // User profile and session
  userProfile: User | null;
  sessionInfo: SessionInfo | null;
  userPreferences: UserPreferences;
  userPermissions: UserPermissions;
  
  // State management
  hasActiveSession: boolean;
  isLoading: boolean;
  userState: UserState; // This now properly matches the enum
  
  // User data actions
  refreshUserData: () => Promise<boolean>;
  clearUserData: () => void;
  
  // Navigation and UI
  getFilteredNavItems: (items: NavItem[]) => NavItem[];
  canAccessRoute: (path: string, requiredRoles?: UserRole[]) => boolean;
  
  // User actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Utility functions
  getUserDisplayName: () => string;
  getUserInitials: () => string;
  getRoleDisplayName: () => string;
  getFormattedDateOfBirth: () => string;
  getAgeFromDOB: () => number | null;
  getGenderDisplayName: () => string;
}

// Default user preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  privacy: {
    showProfile: true,
    showEmail: false,
    showPhone: false,
  },
};

// Permission mapping based on roles
const getPermissionsByRole = (role: UserRole): UserPermissions => {
  const basePermissions = {
    canUpload: false,
    canDownload: true,
    canComment: true,
    canModerate: false,
    canManageUsers: false,
    canAccessAdmin: false,
    canEditContent: false,
    canDeleteContent: false,
  };

  switch (role) {
    case 'admin':
      return {
        ...basePermissions,
        canUpload: true,
        canModerate: true,
        canManageUsers: true,
        canAccessAdmin: true,
        canEditContent: true,
        canDeleteContent: true,
      };
    case 'mod':
      return {
        ...basePermissions,
        canUpload: true,
        canModerate: true,
        canEditContent: true,
        canDeleteContent: true,
      };
    case 'contributor':
      return {
        ...basePermissions,
        canUpload: true,
        canEditContent: true,
      };
    case 'student':
    default:
      return {
        ...basePermissions,
        canUpload: true,
      };
  }
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// Storage abstraction for preferences (in-memory)
const userPreferencesStorage: { [key: string]: UserPreferences } = {};

const getUserPreferencesFromStorage = (): UserPreferences => {
  try {
    const stored = userPreferencesStorage['userPreferences'];
    if (stored) {
      return { ...defaultPreferences, ...stored };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return defaultPreferences;
};

const saveUserPreferencesToStorage = (preferences: UserPreferences): void => {
  try {
    userPreferencesStorage['userPreferences'] = preferences;
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

// Enhanced Token storage abstraction with better error handling
class TokenStorage {
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
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch (error) {
      console.warn('localStorage not available, using in-memory storage:', error);
      this.storageAvailable = false;
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.checkStorageAvailability()) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage read failed, falling back to in-memory storage:', error);
      }
    }
    return this.inMemoryStorage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.checkStorageAvailability()) {
      try {
        localStorage.setItem(key, value);
        // Also store in memory as backup
        this.inMemoryStorage[key] = value;
        return;
      } catch (error) {
        console.warn('localStorage write failed, using in-memory storage:', error);
      }
    }
    this.inMemoryStorage[key] = value;
  }

  removeItem(key: string): void {
    if (this.checkStorageAvailability()) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('localStorage remove failed:', error);
      }
    }
    delete this.inMemoryStorage[key];
  }
}

const tokenStorage = new TokenStorage();

// Helper function to safely parse dates
const safeParseDate = (dateValue: string | Date | undefined): Date => {
  if (!dateValue) return new Date();
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  try {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch {
    return new Date();
  }
};

// Enhanced retry mechanism for network requests
const retryWithBackoff: <T>(
  fn: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number
) => Promise<T> = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, error);
      
      // Don't retry on 401 errors (authentication issues)
      if (error instanceof Response && error.status === 401) {
        throw error;
      }
      
      // If this isn't the last attempt, wait before retrying
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
};

// User Provider Component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(getPermissionsByRole('student'));
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userState, setUserState] = useState<UserState>(UserState.INITIALIZING);

  // Refs to prevent race conditions and track state
  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const initializationCompleteRef = useRef(false);
  const lastRefreshAttempt = useRef<number>(0);
  const refreshRetryCount = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state updates
  const safeSetState = useCallback((updater: () => void) => {
    if (mountedRef.current) {
      updater();
    }
  }, []);

  // Clear user data - FIXED: Using enum values and preserving certain states
  const clearUserData = useCallback((reason?: string) => {
    console.log(`UserContext: Clearing user data${reason ? ` - ${reason}` : ''}`);
    safeSetState(() => {
      setUserProfile(null);
      setSessionInfo(null);
      setUserPermissions(getPermissionsByRole('student'));
      setHasActiveSession(false);
      setUserState(UserState.NO_SESSION);
      setIsLoading(false);
    });
    
    // Only clear token if this is an actual logout, not a network error
    if (!reason || reason === 'logout' || reason === 'session_expired') {
      tokenStorage.removeItem('authToken');
    }
    
    initializationCompleteRef.current = true;
  }, [safeSetState]);

  // Enhanced refresh user data with better error handling and retries
  const refreshUserData = useCallback(async (): Promise<boolean> => {
    // Return existing promise if one is already running
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const token = tokenStorage.getItem('authToken');
    if (!token) {
      console.log('UserContext: No auth token found');
      clearUserData('no_token');
      return false;
    }

    // Prevent too frequent refresh attempts
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 2000) { // 2 second cooldown
      console.log('UserContext: Refresh cooldown active, skipping');
      return false;
    }
    lastRefreshAttempt.current = now;

    // Create new promise and store it
    const refreshPromise = (async (): Promise<boolean> => {
      try {
        safeSetState(() => {
          setUserState(UserState.LOADING);
          setIsLoading(true);
        });

        console.log('UserContext: Fetching comprehensive user session data...');

        // Enhanced fetch with retry mechanism
        const fetchUserData = async () => {
          const controller = new AbortController();
          // Increased timeout to 30 seconds for better reliability
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          try {
            const response = await fetch('/api/user/online-status', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache', // Prevent caching issues
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        };

        // Use retry mechanism for the fetch
        const response = await retryWithBackoff(fetchUserData, 3, 2000);

        if (!response.ok) {
          console.log('UserContext: Online status check failed:', response.status, response.statusText);
          
          if (response.status === 401) {
            console.log("UserContext: Session expired (401), clearing user data");
            clearUserData('session_expired');
            refreshRetryCount.current = 0;
            return false;
          } else if (response.status >= 500) {
            // Server error - don't clear user data, just set error state
            console.log("UserContext: Server error, maintaining current session");
            safeSetState(() => {
              setUserState(UserState.ERROR);
              setIsLoading(false);
            });
            
            // Increment retry count for server errors
            refreshRetryCount.current++;
            
            // Only clear session after multiple server error retries
            if (refreshRetryCount.current >= 5) {
              console.log("UserContext: Too many server errors, clearing session");
              clearUserData('server_error');
            }
            
            return false;
          } else {
            // Other client errors
            console.log("UserContext: Client error, clearing user data");
            clearUserData('client_error');
            return false;
          }
        }

        // Reset retry count on successful response
        refreshRetryCount.current = 0;

        const data = await response.json();
        console.log('UserContext: Online status response received successfully');

        if (data.isOnline && data.user && data.sessionInfo) {
          // Parse and validate the comprehensive user data from SessionCache
          const sessionUser = data.user;
          
          // Create comprehensive user profile from SessionCache data
          const userProfileData: User = {
            id: sessionUser.id,
            fullName: sessionUser.fullName,
            email: sessionUser.email || '',
            role: sessionUser.role as UserRole,
            school: sessionUser.school,
            faculty: sessionUser.faculty,
            department: sessionUser.department,
            uuid: sessionUser.uuid || '',
            upid: sessionUser.upid,
            isVerified: sessionUser.isVerified,
            profilePhoto: sessionUser.profilePhoto,
            phone: sessionUser.phone,
            regNumber: sessionUser.regNumber,
            // Additional SessionCache fields
            dob: safeParseDate(sessionUser.dob),
            gender: sessionUser.gender || 'Other',
            level: sessionUser.level || '',
          };

          // Create comprehensive session info
          const sessionInfoData: SessionInfo = {
            uuid: data.sessionInfo.uuid,
            lastActivity: safeParseDate(data.sessionInfo.lastActivity),
            expiresAt: safeParseDate(data.sessionInfo.expiresAt),
            deviceInfo: data.sessionInfo.deviceInfo || 'Unknown Device',
            ipAddress: data.sessionInfo.ipAddress || 'Unknown IP',
            signInTime: safeParseDate(data.sessionInfo.signInTime || data.sessionInfo.lastActivity),
          };

          console.log('UserContext: Setting comprehensive user data');
          console.log('UserContext: User level:', userProfileData.level);
          console.log('UserContext: User role:', userProfileData.role);

          // Update state with comprehensive data
          safeSetState(() => {
            setUserProfile(userProfileData);
            setSessionInfo(sessionInfoData);
            setUserPermissions(getPermissionsByRole(userProfileData.role));
            setHasActiveSession(true);
            setUserState(UserState.ACTIVE_SESSION);
            setIsLoading(false);
          });
          
          console.log('UserContext: User state set to ACTIVE_SESSION');
          initializationCompleteRef.current = true;
          return true;
        } else {
          console.log('UserContext: No active session found in server response');
          if (data.sessionExpired) {
            console.log("UserContext: Session expired from server");
            clearUserData('session_expired');
          } else {
            clearUserData('no_session');
          }
          return false;
        }
      } catch (error) {
        console.error('UserContext: Failed to refresh user data:', error);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('UserContext: Request timed out - network issue');
          } else if (error.message?.includes('fetch')) {
            console.log('UserContext: Network error - maintaining current session if exists');
            
            // Don't clear user data on network errors if we have an existing session
            if (hasActiveSession && userProfile) {
              console.log('UserContext: Maintaining existing session despite network error');
              safeSetState(() => {
                setUserState(UserState.ERROR);
                setIsLoading(false);
              });
              return false;
            }
          }
        }
        
        // Only set error state, don't clear data immediately
        safeSetState(() => {
          setUserState(UserState.ERROR);
          setIsLoading(false);
        });
        
        initializationCompleteRef.current = true;
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [clearUserData, safeSetState, hasActiveSession, userProfile]);

  // Enhanced initialization with better error handling
  useEffect(() => {
    if (initializationCompleteRef.current) return;
    
    const token = tokenStorage.getItem('authToken');
    console.log("UserContext: Initial check - Token exists?", !!token);
    
    if (token) {
      console.log("UserContext: Token found, refreshing user data");
      refreshUserData().catch(error => {
        console.error("UserContext: Initial refresh failed:", error);
        // Don't clear user data on initialization failure
        safeSetState(() => {
          setUserState(UserState.ERROR);
          setIsLoading(false);
        });
        initializationCompleteRef.current = true;
      });
    } else {
      console.log("UserContext: No token found, setting NO_SESSION state");
      clearUserData('no_token');
    }
  }, [refreshUserData, clearUserData, safeSetState]);

  // Load preferences on mount
  useEffect(() => {
    const preferences = getUserPreferencesFromStorage();
    setUserPreferences(preferences);
  }, []);

  // Enhanced periodic session validation with better error handling
  useEffect(() => {
    if (!hasActiveSession || userState !== UserState.ACTIVE_SESSION) {
      return;
    }

    // Only validate session periodically if user is active
    const validateSession = async () => {
      try {
        console.log('UserContext: Performing periodic session validation...');
        const isValid = await refreshUserData();
        if (!isValid) {
          console.log('UserContext: Periodic validation failed - session may have expired');
        }
      } catch (error) {
        console.error('UserContext: Periodic validation error:', error);
        // Don't logout on periodic validation errors
      }
    };

    // Validate every 15 minutes instead of 10 to reduce server load
    const intervalId = setInterval(validateSession, 15 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [hasActiveSession, userState, refreshUserData]);

  // Handle page visibility changes to refresh session when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hasActiveSession && userState === UserState.ACTIVE_SESSION) {
        // Small delay to allow network to stabilize
        setTimeout(() => {
          refreshUserData().catch(error => {
            console.error('UserContext: Visibility change refresh failed:', error);
          });
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasActiveSession, userState, refreshUserData]);

  // Update user preferences
  const updateUserPreferences = (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...userPreferences, ...newPreferences };
    setUserPreferences(updated);
    saveUserPreferencesToStorage(updated);
  };

  // Filter navigation items based on user permissions
  const getFilteredNavItems = (items: NavItem[]): NavItem[] => {
    if (!hasActiveSession || !userProfile) {
      return items.filter(item => !item.requiresAuth);
    }

    return items.filter(item => {
      if (!item.requiresAuth) return true;
      
      if (item.roles && item.roles.length > 0) {
        return item.roles.includes(userProfile.role);
      }
      
      return true;
    });
  };

  // Check route access
  const canAccessRoute = (path: string, requiredRoles?: UserRole[]): boolean => {
    const publicRoutes = ['/', '/schools', '/about', '/contact', '/auth'];
    if (publicRoutes.some(route => path.startsWith(route))) return true;

    if (!hasActiveSession || !userProfile) return false;

    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.includes(userProfile.role);
    }

    return true;
  };

  // Enhanced utility functions
  const getUserDisplayName = (): string => {
    if (!userProfile) return 'Guest';
    return userProfile.fullName || 'User';
  };

  const getUserInitials = (): string => {
    if (!userProfile?.fullName) return 'GU';
    return userProfile.fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (): string => {
    if (!userProfile) return 'Guest';
    
    const roleNames = {
      admin: 'Administrator',
      contributor: 'Contributor',
      student: 'Student',
      mod: 'Moderator',
      devsupport: 'Dev Support',
    };
    
    return roleNames[userProfile.role] || 'User';
  };

  // New utility functions for additional SessionCache data
  const getFormattedDateOfBirth = (): string => {
    if (!userProfile?.dob) return 'Not provided';
    
    try {
      return userProfile.dob.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getAgeFromDOB = (): number | null => {
    if (!userProfile?.dob) return null;
    
    try {
      const today = new Date();
      const birthDate = new Date(userProfile.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  };

  const getGenderDisplayName = (): string => {
    if (!userProfile?.gender) return 'Not specified';
    return userProfile.gender;
  };

  // Enhanced debug logging for state changes
  useEffect(() => {
    console.log('UserContext State Update:', {
      userState,
      hasActiveSession,
      isLoading,
      userRole: userProfile?.role,
      userName: userProfile?.fullName,
      initializationComplete: initializationCompleteRef.current,
      retryCount: refreshRetryCount.current
    });
  }, [userState, hasActiveSession, isLoading, userProfile]);

  const value: UserContextType = {
    userProfile,
    sessionInfo,
    userPreferences,
    userPermissions,
    hasActiveSession,
    isLoading,
    userState,
    refreshUserData,
    clearUserData: () => clearUserData('manual'),
    getFilteredNavItems,
    canAccessRoute,
    updateUserPreferences,
    getUserDisplayName,
    getUserInitials,
    getRoleDisplayName,
    getFormattedDateOfBirth,
    getAgeFromDOB,
    getGenderDisplayName,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Hook to use user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};