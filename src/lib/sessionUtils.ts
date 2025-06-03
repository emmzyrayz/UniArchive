// /lib/sessionUtils.ts - Utility functions for session management
import { cookies } from "next/headers";
import SessionCache from "@/models/sessionCacheModel";
import connectDB from "@/lib/database";

/**
 * Get current session user using UUID from cookies
 * This is the main function for server-side authentication
 */
export const getCurrentSessionUser = async () => {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    
    if (!sessionId) {
      console.log("No session UUID found in cookies");
      return null;
    }

    console.log("Looking up session with UUID:", sessionId);
    
    const session = await SessionCache.findByUUID(sessionId);
    
    if (!session) {
      console.log("Session not found or expired for UUID:", sessionId);
      return null;
    }

    // Return complete decrypted user data
    return session.getDecryptedUserData();
    
  } catch (error) {
    console.error("Error getting current session user:", error);
    return null;
  }
};

/**
 * Check if current user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentSessionUser();
  return user !== null && user.sessionInfo.isActive;
};

/**
 * Get user role from current session
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  const user = await getCurrentSessionUser();
  return user?.role || null;
};

/**
 * Check if current user has specific role
 */
export const hasRole = async (requiredRole: string): Promise<boolean> => {
  const userRole = await getCurrentUserRole();
  return userRole === requiredRole;
};

/**
 * Check if current user has any of the specified roles
 */
export const hasAnyRole = async (roles: string[]): Promise<boolean> => {
  const userRole = await getCurrentUserRole();
  return userRole ? roles.includes(userRole) : false;
};

/**
 * Sign out current user by invalidating their session
 */
export const signOutCurrentUser = async (): Promise<boolean> => {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    
    if (!sessionId) {
      return false;
    }

    // Invalidate the session in database
    const result = await SessionCache.signOutByUUID(sessionId);
    
    if (result) {
      // Clear the session cookie
      cookieStore.delete("sessionId");
      console.log("User signed out successfully");
    }
    
    return result;
    
  } catch (error) {
    console.error("Error signing out user:", error);
    return false;
  }
};

/**
 * Refresh current user session activity
 */
export const refreshCurrentSession = async (): Promise<boolean> => {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    
    if (!sessionId) {
      return false;
    }

    return await SessionCache.updateActivityByUUID(sessionId);
    
  } catch (error) {
    console.error("Error refreshing session:", error);
    return false;
  }
};

/**
 * Get session info for current user
 */
export const getCurrentSessionInfo = async () => {
  const user = await getCurrentSessionUser();
  return user?.sessionInfo || null;
};

/**
 * Check if user is verified
 */
export const isCurrentUserVerified = async (): Promise<boolean> => {
  const user = await getCurrentSessionUser();
  return user?.isVerified || false;
};

/**
 * Get current user's basic info (without sensitive data)
 */
export const getCurrentUserBasicInfo = async () => {
  const user = await getCurrentSessionUser();
  
  if (!user) return null;
  
  return {
    id: user.userId,
    uuid: user.uuid,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    school: user.school,
    faculty: user.faculty,
    department: user.department,
    profilePhoto: user.profilePhoto,
    isVerified: user.isVerified,
    upid: user.upid
  };
};

/**
 * Middleware helper to protect routes
 */
export const requireAuth = async () => {
  const user = await getCurrentSessionUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  if (!user.sessionInfo.isActive) {
    throw new Error("Session expired");
  }
  
  return user;
};

/**
 * Middleware helper to require specific role
 */
export const requireRole = async (requiredRole: string) => {
  const user = await requireAuth();
  
  if (user.role !== requiredRole) {
    throw new Error(`Role '${requiredRole}' required`);
  }
  
  return user;
};

/**
 * Middleware helper to require any of the specified roles
 */
export const requireAnyRole = async (roles: string[]) => {
  const user = await requireAuth();
  
  if (!roles.includes(user.role)) {
    throw new Error(`One of the following roles required: ${roles.join(', ')}`);
  }
  
  return user;
};

/**
 * Clean up expired sessions (utility function)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    await connectDB();
    return await SessionCache.cleanupExpiredSessions();
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return 0;
  }
};