"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jwt from 'jsonwebtoken';

// User interface
interface User {
  id: string;
  fullName: string;
  email: string;
  school: string;
  faculty: string;
  department: string;
  uuid: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
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
  iat?: number;
  exp?: number;
}

// Context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (formData: SignupFormData) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
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

  // Check for existing token on mount
  useEffect(() => {
    const token = getStorageItem('authToken');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        setUser(decoded.user);
        setIsAuthenticated(true);
      } else {
        removeStorageItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

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
        const { token, user: userData } = data;
        setStorageItem('authToken', token);
        setUser(userData);
        setIsAuthenticated(true);
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
  const logout = () => {
    removeStorageItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
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