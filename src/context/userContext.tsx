"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './authContext';
import type {User} from './authContext';

// User role type
type UserRole = "admin" | "contributor" | "student" | "mod";

// Extended user interface for UserContext
interface UserProfile {
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
  dob?: string;
  phone?: string;
  gender?: string;
  regNumber?: string;
}

type AuthUser = User

// User session information
interface UserSession {
  isActive: boolean;
  loginTime: Date;
  expiresAt: Date;
  lastActivity: Date;
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

// User context interface
interface UserContextType {
  // User profile and session
  userProfile: UserProfile | null;
  userSession: UserSession | null;
  userPreferences: UserPreferences;
  userPermissions: UserPermissions;
  
  // State management
  isUserReady: boolean;
  hasActiveSession: boolean;
  
  // Navigation and UI
  getFilteredNavItems: (items: NavItem[]) => NavItem[];
  canAccessRoute: (path: string, requiredRoles?: UserRole[]) => boolean;
  
  // User actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  updateLastActivity: () => void;
  initializeUserSession: (user: AuthUser) => void;
  clearUserSession: () => void;
  
  // Utility functions
  getUserDisplayName: () => string;
  getUserInitials: () => string;
  getRoleDisplayName: () => string;
  isSessionExpired: () => boolean;
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
        canUpload: true, // Students can upload materials
      };
  }
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// FIXED: Safe date conversion helper
const safeConvertToISOString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  
  try {
    if (typeof date === 'string') {
      // If it's already a string, validate it's a valid date
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
    } else if (date instanceof Date) {
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }
  } catch (error) {
    console.error('Date conversion error:', error);
  }
  
  return undefined;
};



// Storage utilities for user preferences

// Storage utilities for user preferences (in-memory for Claude artifacts)
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

// User Provider Component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(getPermissionsByRole('student'));
  const [isUserReady, setIsUserReady] = useState(false);

  // Initialize user session
  const initializeUserSession = (authUser: AuthUser) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const profile: UserProfile = {
      id: authUser.id,
      fullName: authUser.fullName,
      email: authUser.email,
      role: authUser.role,
      school: authUser.school,
      faculty: authUser.faculty,
      department: authUser.department,
      uuid: authUser.uuid,
      upid: authUser.upid,
      isVerified: authUser.isVerified,
      profilePhoto: authUser.profilePhoto,
      dob: safeConvertToISOString(authUser.dob),
      phone: authUser.phone,
      gender: authUser.gender,
      regNumber: authUser.regNumber,
    };

    const session: UserSession = {
      isActive: true,
      loginTime: now,
      expiresAt,
      lastActivity: now,
    };

    setUserProfile(profile);
    setUserSession(session);
    setUserPermissions(getPermissionsByRole(profile.role));
    setIsUserReady(true);
  };

  // Clear user session
  const clearUserSession = () => {
    setUserProfile(null);
    setUserSession(null);
    setUserPermissions(getPermissionsByRole('student'));
    setIsUserReady(false);
  };

  // Update last activity - wrapped in useCallback to prevent re-renders
  const updateLastActivity = useCallback(() => {
    setUserSession(prev => prev ? {
      ...prev,
      lastActivity: new Date()
    } : null);
  }, []);

  // Check if session is expired
  const isSessionExpired = (): boolean => {
    if (!userSession) return true;
    return new Date() > userSession.expiresAt;
  };

  // Check if user has active session
  const hasActiveSession = userSession?.isActive && !isSessionExpired();

  // Initialize user context when auth user changes
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      initializeUserSession(user);
    } else if (!isAuthenticated && !isLoading) {
      clearUserSession();
    }
  }, [user, isAuthenticated, isLoading]);

  // Load user preferences on mount
  useEffect(() => {
    const preferences = getUserPreferencesFromStorage();
    setUserPreferences(preferences);
  }, []);

  // Session activity tracker
  useEffect(() => {
    if (hasActiveSession) {
      const activityInterval = setInterval(updateLastActivity, 60000); // Update every minute
      return () => clearInterval(activityInterval);
    }
  }, [hasActiveSession, updateLastActivity]);

  // Update user preferences
  const updateUserPreferences = (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...userPreferences, ...newPreferences };
    setUserPreferences(updated);
    saveUserPreferencesToStorage(updated);
  };

  // Filter navigation items based on user permissions
  const getFilteredNavItems = (items: NavItem[]): NavItem[] => {
    if (!isAuthenticated || !userProfile) {
      // Return items that don't require authentication
      return items.filter(item => !item.requiresAuth);
    }

    return items.filter(item => {
      // If item doesn't require auth, show it
      if (!item.requiresAuth) return true;
      
      // If item has role restrictions, check user role
      if (item.roles && item.roles.length > 0) {
        return item.roles.includes(userProfile.role);
      }
      
      // If item requires auth but no specific roles, show it
      return true;
    });
  };

  // Check if user can access a specific route
  const canAccessRoute = (path: string, requiredRoles?: UserRole[]): boolean => {
    // Public routes
    const publicRoutes = ['/', '/schools', '/about', '/contact', '/auth'];
    if (publicRoutes.some(route => path.startsWith(route))) return true;

    // Require authentication for other routes
    if (!isAuthenticated || !userProfile) return false;

    // Check role-specific access
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.includes(userProfile.role);
    }

    return true;
  };

  // Get user display name
  const getUserDisplayName = (): string => {
    if (!userProfile) return 'Guest';
    return userProfile.fullName || 'User';
  };

  // Get user initials
  const getUserInitials = (): string => {
    if (!userProfile?.fullName) return 'GU';
    return userProfile.fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role display name
  const getRoleDisplayName = (): string => {
    if (!userProfile) return 'Guest';
    
    const roleNames = {
      admin: 'Administrator',
      contributor: 'Contributor',
      student: 'Student',
      mod: 'Moderator',
    };
    
    return roleNames[userProfile.role] || 'User';
  };

  const value: UserContextType = {
    userProfile,
    userSession,
    userPreferences,
    userPermissions,
    isUserReady,
    hasActiveSession: !!hasActiveSession,
    getFilteredNavItems,
    canAccessRoute,
    updateUserPreferences,
    updateLastActivity,
    initializeUserSession,
    clearUserSession,
    getUserDisplayName,
    getUserInitials,
    getRoleDisplayName,
    isSessionExpired,
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