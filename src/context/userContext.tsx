"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

// User role type
type UserRole = "admin" | "contributor" | "student" | "mod" | "devsupport";

// Enhanced User interface - matches SessionCache data structure
interface User {
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

// Token storage abstraction
class TokenStorage {
  private inMemoryStorage: { [key: string]: string } = {};

  getItem(key: string): string | null {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage access failed, using in-memory storage:', error);
        return this.inMemoryStorage[key] || null;
      }
    }
    return this.inMemoryStorage[key] || null;
  }

  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (error) {
        console.warn('localStorage write failed, using in-memory storage:', error);
      }
    }
    this.inMemoryStorage[key] = value;
  }

  removeItem(key: string): void {
    if (typeof window !== 'undefined') {
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

// User Provider Component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(getPermissionsByRole('student'));
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userState, setUserState] = useState<UserState>(UserState.INITIALIZING);

  // Refs to prevent race conditions
  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const initializationCompleteRef = useRef(false);

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

  // Clear user data - FIXED: Using enum values
  const clearUserData = useCallback(() => {
    console.log('UserContext: Clearing user data and setting NO_SESSION state');
    safeSetState(() => {
      setUserProfile(null);
      setSessionInfo(null);
      setUserPermissions(getPermissionsByRole('student'));
      setHasActiveSession(false);
      setUserState(UserState.NO_SESSION); // FIXED: Using enum value
      setIsLoading(false);
    });
    
    // Also clear the auth token
    tokenStorage.removeItem('authToken');
  }, [safeSetState]);

  // Refresh user data from SessionCache via online-status
  const refreshUserData = useCallback(async (): Promise<boolean> => {
    // Return existing promise if one is already running
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const token = tokenStorage.getItem('authToken');
    if (!token) {
      console.log('UserContext: No auth token found');
      clearUserData();
      return false;
    }

    // Create new promise and store it
    const refreshPromise = (async (): Promise<boolean> => {
      try {
        safeSetState(() => {
          setUserState(UserState.LOADING); // FIXED: Using enum value
          setIsLoading(true);
        });

        console.log('UserContext: Fetching comprehensive user session data...');

         // FIXED: Reduced timeout for faster response
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/user/online-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log('UserContext: Online status check failed:', response.status);
          if (response.status === 401) {
            console.log("UserContext: Session expired, clearing user data");
            clearUserData();
          } else {
            // For other errors, set error state but don't clear user data immediately
            safeSetState(() => {
              setUserState(UserState.ERROR);
              setIsLoading(false);
            });
          }
          return false;
        }

        const data = await response.json();
        console.log('UserContext: Online status response received');
        console.log('UserContext: User data includes level:', data.user?.level);

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
            // Derive sign-in time (we can use lastActivity as a proxy if signInTime isn't available)
            signInTime: safeParseDate(data.sessionInfo.signInTime || data.sessionInfo.lastActivity),
          };

          console.log('UserContext: Setting comprehensive user data');
          console.log('UserContext: User level:', userProfileData.level);
          console.log('UserContext: User role:', userProfileData.role);

          // Update state with comprehensive data - FIXED: Using enum value
          safeSetState(() => {
            setUserProfile(userProfileData);
            setSessionInfo(sessionInfoData);
            setUserPermissions(getPermissionsByRole(userProfileData.role));
            setHasActiveSession(true);
            setUserState(UserState.ACTIVE_SESSION); // FIXED: Using enum value
            setIsLoading(false);
          });
          
          console.log('UserContext: User state set to ACTIVE_SESSION');
          initializationCompleteRef.current = true;
          return true;
        } else {
          console.log('UserContext: No active session found in server response');
          if (data.sessionExpired) {
            console.log("UserContext: Session expired from server");
          }
          clearUserData();
          return false;
        }
      } catch (error) {
        console.error('UserContext: Failed to refresh user data:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('UserContext: Request timed out');
        }
        safeSetState(() => {
          setUserState(UserState.ERROR); // FIXED: Using enum value
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
  }, [clearUserData, safeSetState]);

  // FIXED: Only trigger refresh if we haven't initialized and there's a token
  useEffect(() => {
    if (initializationCompleteRef.current) return;
    
    const token = tokenStorage.getItem('authToken');
    console.log("UserContext: Initial check - Token exists?", !!token);
    
    if (token) {
      console.log("UserContext: Token found, refreshing user data");
      refreshUserData();
    } else {
      console.log("UserContext: No token found, setting NO_SESSION state");
      clearUserData();
    }
  }, [refreshUserData, clearUserData]);

  // Initialize user data on mount
  useEffect(() => {
    console.log('UserContext: Initializing...');
    const initializeUser = async () => {
      // Small delay to ensure proper mounting
      await new Promise(resolve => setTimeout(resolve, 50));
      await refreshUserData();
    };
    
    initializeUser();
  }, [refreshUserData]);

  // Load preferences on mount
  useEffect(() => {
    const preferences = getUserPreferencesFromStorage();
    setUserPreferences(preferences);
  }, []);

  // REMOVED: Periodic session validation that was causing logouts
  // The useEffect that ran every 10 minutes has been completely removed

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

 // Debug logging for state changes
  useEffect(() => {
    console.log('UserContext State Update:', {
      userState,
      hasActiveSession,
      isLoading,
      userRole: userProfile?.role,
      userName: userProfile?.fullName,
      initializationComplete: initializationCompleteRef.current
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
    clearUserData,
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