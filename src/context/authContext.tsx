"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import jwt from 'jsonwebtoken';

// User role type
type UserRole = "admin" | "contributor" | "student" | "mod";


// User interface
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole; // Added role property
  school: string;
  faculty: string;
  department: string;
  uuid: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
  dob: Date; // Changed from optional to required Date type
  phone?: string; // Added phone property
  gender?: string; // Added gender property
  regNumber?: string; // Added regNumber property
}

// Form data interface for signup
interface SignupFormData {
  name: string;
  email: string;
  password: string;
  gender: string;
  dob: string;
  phone: string;
  university: string;
  faculty: string;
  department: string;
  regnumber: string;
  confirmpassword: string;
}

// JWT payload interface
interface JWTPayload {
  user: User;
  sessionToken: string;
  iat?: number;
  exp?: number;
}

// Session info interface
interface SessionInfo {
  signInTime: string;
  lastActivity: string;
  expiresAt: string;
  deviceInfo: string;
  sessionToken?: string; // Add session token to session info
}

// Context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionInfo: SessionInfo | null;
  register: (formData: SignupFormData) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: (logoutAllSessions?: boolean) => Promise<void>;
  checkOnlineStatus: () => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT utilities (for client-side token verification only)
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-jwt-secret-key';

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

// Browser storage utilities
const getStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeStorageItem = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // Use ref to prevent multiple simultaneous auth checks
  const isCheckingAuth = useRef(false);
  const initializationComplete = useRef(false);


  // Handle logout - moved up to be used in checkOnlineStatus
  // Handle logout - moved up to be used in checkOnlineStatus
  const handleLogout = useCallback(async (logoutAllSessions: boolean = false) => {
    const token = getStorageItem('authToken');
    
    if (token) {
      try {
        if (logoutAllSessions) {
          // Logout all sessions
          await fetch('/api/auth/logout', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else {
          // Logout current session only
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with local logout even if API fails
      }
    }

    // Clear local state regardless of API response
    removeStorageItem('authToken');
    removeStorageItem('sessionToken');
    setUser(null);
    setIsAuthenticated(false);
    setSessionInfo(null);
  }, []);

  // Check online status with server
   // Check online status with server - wrapped with useCallback
  const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    
    if (isCheckingAuth.current) {
      return false;
    }
    const token = getStorageItem('authToken');
    if (!token) {
      return false;
    }

    isCheckingAuth.current = true;

    try {
      const response = await fetch('/api/user/online-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If response is not ok, consider session invalid
        if (response.status === 401) {
          console.log("Session expired, logging out");
          await handleLogout(false);
        }
        return false;
      }

      const data = await response.json();

      if (data.isOnline) {
        // Update session info if available
        if (data.sessionInfo) {
          setSessionInfo({
            ...data.sessionInfo,
            sessionToken: getStorageItem('sessionToken') || undefined
          });
        }
        return true;
      } else {
        // Session expired or invalid
        if (data.sessionExpired) {
          console.log("Session expired, logging out");
          await handleLogout(false);
        }
        return false;
      }
    } catch (error) {
      console.error('Online status check failed:', error);
      return false;
    }
  }, [handleLogout]);

   // Initialize auth state - wrapped in useCallback and using ref to prevent loops
  const initializeAuth = useCallback(async () => {
    if (initializationComplete.current || isCheckingAuth.current) {
      return;
    }

    isCheckingAuth.current = true;
    setIsLoading(true);

    try {
      const token = getStorageItem('authToken');
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          // Token is valid locally, now check with server
          const isOnline = await checkOnlineStatus();
          if (isOnline) {
            setUser(decoded.user);
            setIsAuthenticated(true);
          } else {
            // Server says session is invalid
            removeStorageItem('authToken');
            removeStorageItem('sessionToken');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // Token is invalid locally
          removeStorageItem('authToken');
          removeStorageItem('sessionToken');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid state
      removeStorageItem('authToken');
      removeStorageItem('sessionToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      initializationComplete.current = true;
      isCheckingAuth.current = false;
    }
  }, [checkOnlineStatus]);



  // Periodic session validation (every 5 minutes) - only after initialization
  useEffect(() => {
    if (!isAuthenticated || !initializationComplete.current) return;

    const interval = setInterval(async () => {
      if (!isCheckingAuth.current) {
        const isStillOnline = await checkOnlineStatus();
        if (!isStillOnline) {
          console.log("Session validation failed, logging out");
          await handleLogout(false);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, checkOnlineStatus, handleLogout]);

// Check for existing token and validate with server on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Register function - now sends plain data to API
  const register = async (formData: SignupFormData): Promise<{ success: boolean; message: string; requiresVerification?: boolean }> => {
    try {
      setIsLoading(true);

      // Validate passwords match
      if (formData.password !== formData.confirmpassword) {
        return { success: false, message: 'Passwords do not match' };
      }

      // Send plain form data - API will handle encryption
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: 'Registration successful! Please check your email for verification code.',
          requiresVerification: true 
        };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Login function - now sends plain data to API
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, // Send plain email
          password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user: userData, sessionToken } = data;

        // Store both JWT token and session token
        setStorageItem('authToken', token);
        if (sessionToken) {
          setStorageItem('sessionToken', sessionToken);
        }

        setUser(userData);
        setIsAuthenticated(true);

         // Get session info after verification
        await checkOnlineStatus();

        return { success: true, message: 'Login successful!' };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (logoutAllSessions: boolean = false): Promise<void> => {
    await handleLogout(logoutAllSessions);
  };


  // Verify email function - now sends plain email to API
  const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/verifyemail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, // Send plain email
          code 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user: userData } = data;
        setStorageItem('authToken', token);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, message: 'Email verified successfully!' };
      } else {
        return { success: false, message: data.message || 'Verification failed' };
      }
    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password function - now sends plain email to API
  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/forgotten-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email // Send plain email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: 'Password reset link sent to your email!' };
      } else {
        return { success: false, message: data.message || 'Failed to send reset email' };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/resetpassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: 'Password reset successful!' };
      } else {
        return { success: false, message: data.message || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification function - now sends plain email to API
  const resendVerification = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/resendverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email // Send plain email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: 'Verification code sent!' };
      } else {
        return { success: false, message: data.message || 'Failed to resend verification' };
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    sessionInfo,
    checkOnlineStatus,
    register,
    login,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};