"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { USERS_DATA } from "@/assets/data/blogData";
import universitiesData from "@/assets/data/schoolData";
import type { UserRole } from "@/types/roles";
import { can } from "@/lib/auth/permissions";
import { IS_MOCK_MODE } from "@/lib/mockMode";
import type { ProfileCompletion } from "@/lib/profileCompletion";

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

// 1. Grab David Martinez (Student) and Linda Thompson (Admin) from your blogData
const studentData = USERS_DATA.find((u) => u.id === 4)!;
const adminData = USERS_DATA.find((u) => u.id === 5)!;

// 2. Map them to match the strict UserContext interface
const mockStudentUser: User = {
  id: String(studentData.id),
  fullName: studentData.displayName,
  email: `${studentData.username}@student.edu`,
  bio: "Computer Science student at UNIZIK. Loves algorithms and data structures.",
joinedAt: "2024-01-15T08:00:00Z",
  role: "student",
  school: universitiesData.universities[0].name, // Abia State University, Uturu
  faculty: "Engineering",
  department: "Computer Science",
  uuid: `uuid-${studentData.id}`,
  upid: `upid-${studentData.id}`,
  isVerified: true,
  profilePhoto: `/images/avatars/${studentData.avatarId}.jpg`, // Resolves avatar-4
  dob: new Date("2003-05-20"),
  gender: "Male",
  level: "300 Level",
};

const mockAdminUser: User = {
  id: String(adminData.id),
  fullName: adminData.displayName,
  email: `${adminData.username}@uniarchive.edu`,
  bio: "Computer Science student at UNIZIK. Loves algorithms and data structures.",
joinedAt: "2024-01-15T08:00:00Z",
  role: "webmaster",
  school: universitiesData.universities[0].name,
  faculty: "Administration",
  department: "IT",
  uuid: `uuid-${adminData.id}`,
  upid: `upid-${adminData.id}`,
  isVerified: true,
  profilePhoto: `/images/avatars/${adminData.avatarId}.jpg`,
  dob: new Date("1985-01-15"),
  gender: "Female",
  level: "Staff",
};

// 3. Keep the mock session info for the context state
const mockSessionInfo = {
  uuid: "sess_xyz_789",
  lastActivity: safeParseDate(studentData.lastActive),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  ipAddress: "192.168.1.105",
  signInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
};




// Shape returned by GET /api/auth/me
export interface MeResponse {
  user: {
    id: string;
    upid: string;
    uuid: string;
    role: UserRole;
    fullName: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    bio?: string;
    dob?: string;
    phoneMasked: string | null;
    school: string;
    faculty: string;
    department: string;
    level: string;
    semester?: string;
    universityId?: string;
    universityName?: string;
    universityAbbr?: string;
    facultyId?: string;
    facultyName?: string;
    departmentId?: string;
    departmentName?: string;
    verifiedMaterialCount: number;
    submissionCount: number;
    roleUpgradedAt?: string;
    pendingSuggestionId?: string;
    isVerified: boolean;
    profilePhoto?: string;
    joinedAt?: string;
    profileCompletion: ProfileCompletion;
  };
}

const userFromMe = ({ user }: MeResponse): User => ({
  id: user.id,
  fullName: user.fullName,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  email: user.email,
  bio: user.bio,
  dob: user.dob ? new Date(user.dob) : undefined,
  phoneMasked: user.phoneMasked,
  role: user.role,
  school: user.school,
  faculty: user.faculty,
  department: user.department,
  semester: user.semester,
  universityId: user.universityId,
  universityName: user.universityName,
  universityAbbr: user.universityAbbr,
  facultyId: user.facultyId,
  facultyName: user.facultyName,
  departmentId: user.departmentId,
  departmentName: user.departmentName,
  verifiedMaterialCount: user.verifiedMaterialCount,
  submissionCount: user.submissionCount,
  roleUpgradedAt: user.roleUpgradedAt,
  pendingSuggestionId: user.pendingSuggestionId,
  uuid: user.uuid,
  upid: user.upid,
  isVerified: user.isVerified,
  profilePhoto: user.profilePhoto,
  level: user.level,
  joinedAt: user.joinedAt,
});

const fetchCurrentUser = async (): Promise<{
  user: User;
  profileCompletion: ProfileCompletion;
}> => {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  // Thrown as a Response so retryWithBackoff doesn't retry a 401
  if (response.status === 401) throw response;
  if (!response.ok) throw new Error(`/api/auth/me failed with ${response.status}`);
  const body = (await response.json()) as MeResponse;
  return { user: userFromMe(body), profileCompletion: body.user.profileCompletion };
};

// Enhanced User interface - matches SessionCache data structure
export interface User {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  bio?: string;
  joinedAt?: string;
  role: UserRole;
  school: string;
  faculty: string;
  department: string;
  semester?: string;
  // Normalized institution refs and their denormalised names
  universityId?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  /** Display-only mask; the real number never reaches the client. */
  phoneMasked?: string | null;
  verifiedMaterialCount?: number;
  submissionCount?: number;
  roleUpgradedAt?: string;
  /** School suggestion awaiting review, if any. */
  pendingSuggestionId?: string;
  uuid: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
  phone?: string;
  regNumber?: string;
  // Additional fields from SessionCache
  // Collected in profile completion; absent for newly registered users.
  dob?: Date;
  gender?: 'Male' | 'Female' | 'Other';
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
  /** From /api/auth/me; null when signed out or in mock mode. */
  profileCompletion: ProfileCompletion | null;
  sessionInfo: SessionInfo | null;
  userPreferences: UserPreferences;
  userPermissions: UserPermissions;

  /** Ends the server session (clears the cookie), then clears local state. */
  logout: () => Promise<void>;

  // State management
  hasActiveSession: boolean;
  isLoading: boolean;
  userState: UserState; // This now properly matches the enum

  // User data actions
  /** force: skip the 2s cooldown (e.g. right after signing in). */
  refreshUserData: (options?: { force?: boolean }) => Promise<boolean>;
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

// Permission flags derived from the shared matrix in lib/auth/permissions.ts
const getPermissionsByRole = (role: UserRole): UserPermissions => ({
  canUpload: can(role, "upload"),
  canDownload: can(role, "download"),
  canComment: can(role, "comment"),
  canModerate: can(role, "moderate"),
  canManageUsers: can(role, "manage_users"),
  canAccessAdmin: can(role, "admin"),
  canEditContent: can(role, "edit"),
  canDeleteContent: can(role, "delete"),
});

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

// User Provider Component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [profileCompletion, setProfileCompletion] =
    useState<ProfileCompletion | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() =>
    getUserPreferencesFromStorage(),
  );
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(
    getPermissionsByRole("student"),
  );
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userState, setUserState] = useState<UserState>(UserState.INITIALIZING);

  // Refs to prevent race conditions and track state
  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const initializationCompleteRef = useRef(false);
  const lastRefreshAttempt = useRef<number>(0);
  // Whether a user is currently loaded; background refreshes shouldn't
  // flip the UI back into its loading state.
  const hasSessionRef = useRef(false);
  const refreshRetryCount = useRef<number>(0);
  

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true; // reset on every (re)mount, including StrictMode's remount
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
  const clearUserData = useCallback(
    (reason?: string) => {
      console.log(
        `UserContext (MOCK): Clearing user data${reason ? ` - ${reason}` : ""}`,
      );
      hasSessionRef.current = false;
      safeSetState(() => {
        setUserProfile(null);
        setProfileCompletion(null);
        setSessionInfo(null);
        setUserPermissions(getPermissionsByRole("student"));
        setHasActiveSession(false);
        setUserState(UserState.NO_SESSION);
        setIsLoading(false);
      });

      // Only clear token if this is an actual logout, not a network error
      if (!reason || reason === "logout" || reason === "session_expired") {
        tokenStorage.removeItem("authToken");
      }

      initializationCompleteRef.current = true;
    },
    [safeSetState],
  );

  const logout = useCallback(async () => {
    tokenStorage.removeItem("authToken");
    if (!IS_MOCK_MODE) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch (error) {
        // Still clear local state; the server session expires on its own
        console.error("UserContext: logout request failed", error);
      }
    }
    clearUserData("logout");
  }, [clearUserData]);

  // Enhanced refresh user data with better error handling and retries
  const refreshUserData = useCallback(async (
    options: { force?: boolean } = {},
  ): Promise<boolean> => {
    // Return existing promise if one is already running
    if (refreshPromiseRef.current && !options.force) {
      return refreshPromiseRef.current;
    }

    // The mock token only matters in mock mode; real sessions live in an
    // httpOnly cookie the client can't read.
    if (IS_MOCK_MODE && !tokenStorage.getItem("authToken")) {
      console.log("UserContext (MOCK): No auth token found");
      clearUserData("no_token");
      return false;
    }

    // Prevent too frequent refresh attempts
    const now = Date.now();
    if (!options.force && now - lastRefreshAttempt.current < 2000) {
      // 2 second cooldown
      console.log("UserContext: Refresh cooldown active, skipping");
      return false;
    }
    lastRefreshAttempt.current = now;

    const refreshPromise = (async (): Promise<boolean> => {
      try {
        const isBackgroundRefresh = hasSessionRef.current;
        if (!isBackgroundRefresh) {
          safeSetState(() => {
            setUserState(UserState.LOADING);
            setIsLoading(true);
          });
        }

        const { user: activeUser, profileCompletion: completion } = IS_MOCK_MODE
          ? await retryWithBackoff(async () => {
              // Simulated network latency for the mock user
              await new Promise((resolve) => setTimeout(resolve, 800));
              return {
                user:
                  process.env.NEXT_PUBLIC_MOCK_ROLE === "admin"
                    ? mockAdminUser
                    : mockStudentUser,
                profileCompletion: null,
              };
            })
          : await retryWithBackoff(fetchCurrentUser);

        hasSessionRef.current = true;
        safeSetState(() => {
          setUserProfile(activeUser);
          setProfileCompletion(completion);
          setSessionInfo(IS_MOCK_MODE ? mockSessionInfo : null);
          setUserPermissions(getPermissionsByRole(activeUser.role));
          setHasActiveSession(true);
          setUserState(UserState.ACTIVE_SESSION);
          setIsLoading(false);
        });

        console.log(
          `UserContext${IS_MOCK_MODE ? " (MOCK)" : ""}: Signed in as ${activeUser.fullName} (${activeUser.role})`,
        );
        initializationCompleteRef.current = true;
        return true;
      } catch (error) {
        // No valid session (never signed in, expired, or signed out elsewhere)
        if (error instanceof Response && error.status === 401) {
          clearUserData("session_expired");
          return false;
        }
        console.error("UserContext: Failed to load the current user", error);
        // A network blip during a background refresh keeps the current
        // session; periodic validation will try again later.
        const keepSession = hasSessionRef.current;
        safeSetState(() => {
          setUserState(keepSession ? UserState.ACTIVE_SESSION : UserState.ERROR);
          setIsLoading(false);
        });
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [clearUserData, safeSetState]);

  // Enhanced initialization with better error handling
  useEffect(() => {
    if (initializationCompleteRef.current) return;

    if (IS_MOCK_MODE) {
      // Mock mode: always signed in as the mock user
      tokenStorage.setItem("authToken", "mock_dev_token_123");
    }

    // Real mode: GET /api/auth/me decides whether a session exists
    refreshUserData();
  }, [refreshUserData, clearUserData, safeSetState]);

  // Enhanced periodic session validation with better error handling
  useEffect(() => {
    if (!hasActiveSession || userState !== UserState.ACTIVE_SESSION) {
      return;
    }

    // Only validate session periodically if user is active
    const validateSession = async () => {
      try {
        console.log("UserContext: Performing periodic session validation...");
        const isValid = await refreshUserData();
        if (!isValid) {
          console.log(
            "UserContext: Periodic validation failed - session may have expired",
          );
        }
      } catch (error) {
        console.error("UserContext: Periodic validation error:", error);
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
      if (
        !document.hidden &&
        hasActiveSession &&
        userState === UserState.ACTIVE_SESSION
      ) {
        // Small delay to allow network to stabilize
        setTimeout(() => {
          refreshUserData().catch((error) => {
            console.error(
              "UserContext: Visibility change refresh failed:",
              error,
            );
          });
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      return items.filter((item) => !item.requiresAuth);
    }

    return items.filter((item) => {
      if (!item.requiresAuth) return true;

      if (item.roles && item.roles.length > 0) {
        return item.roles.includes(userProfile.role);
      }

      return true;
    });
  };

  // Check route access
const canAccessRoute = useCallback(
  (path: string): boolean => {
    const publicRoutes = ["/", "/about", "/contact", "/help", "/offline"];
    const publicPrefixes = ["/auth"];

    if (publicRoutes.includes(path)) return true;
    if (publicPrefixes.some((prefix) => path.startsWith(prefix))) return true;
    if (!hasActiveSession) return false;
    if (!userProfile) return false;

    const adminPrefixes = ["/admin", "/moderation"];
    const adminRoles: UserRole[] = [
      "ed_admin",
      "com_admin",
      "webmaster",
      "dev",
    ];
    if (adminPrefixes.some((p) => path.startsWith(p))) {
      return adminRoles.includes(userProfile.role);
    }

    return true; // authenticated users can access all other routes
  },
  [hasActiveSession, userProfile],
);

  // Enhanced utility functions
  const getUserDisplayName = (): string => {
    if (!userProfile) return "Guest";
    return userProfile.fullName || "User";
  };

  const getUserInitials = (): string => {
    if (!userProfile?.fullName) return "GU";
    return userProfile.fullName
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (): string => {
    if (!userProfile) return "Guest";

    const roleNames: Record<UserRole, string> = {
      student: "Student",
      collaborator: "Collaborator",
      auditor: "Auditor",
      course_rep: "Course Rep",
      lecturer: "Lecturer",
      ed_admin: "Editorial Admin",
      com_admin: "Community Admin",
      webmaster: "Webmaster",
      dev: "Developer",
    };

    return roleNames[userProfile.role] || "User";
  };

  // New utility functions for additional SessionCache data
  const getFormattedDateOfBirth = (): string => {
    if (!userProfile?.dob) return "Not provided";

    try {
      return userProfile.dob.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getAgeFromDOB = (): number | null => {
    if (!userProfile?.dob) return null;

    try {
      const today = new Date();
      const birthDate = new Date(userProfile.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  };

  const getGenderDisplayName = (): string => {
    if (!userProfile?.gender) return "Not specified";
    return userProfile.gender;
  };

  // Enhanced debug logging for state changes
  useEffect(() => {
    console.log("UserContext State Update:", {
      userState,
      hasActiveSession,
      isLoading,
      userRole: userProfile?.role,
      userName: userProfile?.fullName,
      initializationComplete: initializationCompleteRef.current,
      retryCount: refreshRetryCount.current,
    });
  }, [userState, hasActiveSession, isLoading, userProfile]);

  const value: UserContextType = {
    userProfile,
    profileCompletion,
    sessionInfo,
    userPreferences,
    userPermissions,
    hasActiveSession,
    isLoading,
    userState,
    logout,
    refreshUserData,
    clearUserData: () => clearUserData("manual"),
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
};;

// Hook to use user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};