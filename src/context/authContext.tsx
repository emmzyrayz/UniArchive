"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import jwt from 'jsonwebtoken';

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
  level: string;
  confirmpassword: string;
}

// JWT payload interface (minimal - just for token validation)
interface JWTPayload {
  sessionToken: string;
  iat?: number;
  exp?: number;
}

// Auth state enum for clearer state management
enum AuthState {
  INITIALIZING = 'initializing',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  CHECKING_SESSION = 'checking_session',
  ERROR = 'error'
}

// Context interface - focused only on authentication
interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  sessionToken: string | null;
  register: (formData: SignupFormData) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: (logoutAllSessions?: boolean) => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT utilities
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-jwt-secret-key';

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

// Storage abstraction for better reliability
class StorageManager {
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

  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn('localStorage clear failed:', error);
      }
    }
    this.inMemoryStorage = {};
  }
}

const storage = new StorageManager();

// Auth Provider Component - focused only on authentication
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>(AuthState.INITIALIZING);

  // Use refs to prevent race conditions and memory leaks
  const mountedRef = useRef(true);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const sessionCheckPromiseRef = useRef<Promise<boolean> | null>(null);
  const logoutInProgressRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state updates that check component mount status
  const safeSetState = useCallback((updater: () => void) => {
    if (mountedRef.current) {
      updater();
    }
  }, []);

  // Improved logout with better error handling and state management
  const handleLogout = useCallback(async (logoutAllSessions: boolean = false) => {
    if (logoutInProgressRef.current) {
      return; // Prevent concurrent logout calls
    }

    logoutInProgressRef.current = true;
    const token = storage.getItem('authToken');
    
    try {
      if (token) {
        const endpoint = logoutAllSessions ? 'DELETE' : 'POST';
        
        await fetch('/api/auth/logout', {
          method: endpoint,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API response
      storage.removeItem('authToken');
      storage.removeItem('sessionToken');
      
      safeSetState(() => {
        setSessionToken(null);
        setIsAuthenticated(false);
        setAuthState(AuthState.UNAUTHENTICATED);
        setIsLoading(false);
      });
      
      logoutInProgressRef.current = false;
    }
  }, [safeSetState]);

  // Check authentication status with server
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    // Return existing promise if one is already running
    if (sessionCheckPromiseRef.current) {
      return sessionCheckPromiseRef.current;
    }

    const token = storage.getItem('authToken');
    if (!token) {
      return false;
    }

    // Create new promise and store it
    const checkPromise = (async (): Promise<boolean> => {
      try {
        safeSetState(() => setAuthState(AuthState.CHECKING_SESSION));

        const response = await fetch('/api/user/online-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Session expired, logging out");
            await handleLogout(false);
          }
          return false;
        }

        const data = await response.json();

        if (data.isOnline) {
          return true;
        } else {
          if (data.sessionExpired) {
            console.log("Session expired, logging out");
            await handleLogout(false);
          }
          return false;
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        return false;
      } finally {
        sessionCheckPromiseRef.current = null;
      }
    })();

    sessionCheckPromiseRef.current = checkPromise;
    return checkPromise;
  }, [handleLogout, safeSetState]);

  // Single initialization function with proper promise handling
  const initializeAuth = useCallback(async (): Promise<void> => {
    // Return existing promise if initialization is already in progress
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    const initPromise = (async (): Promise<void> => {
      try {
        console.log('Initializing auth...');
        
        safeSetState(() => {
          setAuthState(AuthState.INITIALIZING);
          setIsLoading(true);
        });

        const token = storage.getItem('authToken');
        const storedSessionToken = storage.getItem('sessionToken');
        
        if (!token || !storedSessionToken) {
          console.log('No token or session token found');
          safeSetState(() => {
            setSessionToken(null);
            setIsAuthenticated(false);
            setAuthState(AuthState.UNAUTHENTICATED);
            setIsLoading(false);
          });
          return;
        }

        // Verify token locally first
        const decoded = verifyToken(token);
        if (!decoded) {
          console.log('Token verification failed');
          storage.removeItem('authToken');
          storage.removeItem('sessionToken');
          safeSetState(() => {
            setSessionToken(null);
            setIsAuthenticated(false);
            setAuthState(AuthState.UNAUTHENTICATED);
            setIsLoading(false);
          });
          return;
        }

        console.log('Token verified locally, checking server status...');
        
        // Check with server
        const isOnline = await checkAuthStatus();
        
        if (isOnline) {
          console.log('Server confirmed session is valid');
          safeSetState(() => {
            setSessionToken(storedSessionToken);
            setIsAuthenticated(true);
            setAuthState(AuthState.AUTHENTICATED);
            setIsLoading(false);
          });
        } else {
          console.log('Server says session is invalid');
          storage.removeItem('authToken');
          storage.removeItem('sessionToken');
          safeSetState(() => {
            setSessionToken(null);
            setIsAuthenticated(false);
            setAuthState(AuthState.UNAUTHENTICATED);
            setIsLoading(false);
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        storage.removeItem('authToken');
        storage.removeItem('sessionToken');
        safeSetState(() => {
          setSessionToken(null);
          setIsAuthenticated(false);
          setAuthState(AuthState.ERROR);
          setIsLoading(false);
        });
      } finally {
        initializationPromiseRef.current = null;
      }
    })();

    initializationPromiseRef.current = initPromise;
    return initPromise;
  }, [checkAuthStatus, safeSetState]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Periodic session validation
  useEffect(() => {
    if (authState !== AuthState.AUTHENTICATED) return;

    const interval = setInterval(async () => {
      // Only check if not already checking and not logging out
      if (!sessionCheckPromiseRef.current && !logoutInProgressRef.current) {
        const isStillOnline = await checkAuthStatus();
        if (!isStillOnline && mountedRef.current) {
          console.log("Session validation failed, logging out");
          await handleLogout(false);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [authState, checkAuthStatus, handleLogout]);

  // Register function
  const register = async (formData: SignupFormData): Promise<{ success: boolean; message: string; requiresVerification?: boolean }> => {
    try {
      safeSetState(() => setIsLoading(true));

      if (formData.password !== formData.confirmpassword) {
        return { success: false, message: 'Passwords do not match' };
      }

      // Map frontend form data to backend expected format
      const backendData = {
        name: formData.name,           // Frontend: name -> Backend: name
        email: formData.email,
        password: formData.password,
        confirmpassword: formData.confirmpassword,
        gender: formData.gender,
        dob: formData.dob,
        phone: formData.phone,
        university: formData.university,
        faculty: formData.faculty,
        department: formData.department,
        regnumber: formData.regnumber,  
        level: formData.level            // This should now work properly
      };

      console.log('Sending registration data:', backendData); // Debug log

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData),
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
      safeSetState(() => setIsLoading(false));
    }
  };

  // Login function - only handles authentication, no user data
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      safeSetState(() => {
        setIsLoading(true);
        setAuthState(AuthState.CHECKING_SESSION);
      });

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, sessionToken: returnedSessionToken } = data;

        console.log('Login successful, storing auth tokens');

        // Store tokens
        storage.setItem('authToken', token);
        if (returnedSessionToken) {
          storage.setItem('sessionToken', returnedSessionToken);
        }

        // Update authentication state only
        safeSetState(() => {
          setSessionToken(returnedSessionToken);
          setIsAuthenticated(true);
          setAuthState(AuthState.AUTHENTICATED);
          setIsLoading(false);
        });

        // Wait for state to be fully updated
      await new Promise(resolve => setTimeout(resolve, 50));

      console.log('Auth state updated successfully');
      return { success: true, message: 'Login successful!' };
      } else {
        safeSetState(() => {
          setAuthState(AuthState.UNAUTHENTICATED);
        setIsLoading(false);
        });
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      safeSetState(() => {
        setAuthState(AuthState.ERROR);
      setIsLoading(false);
      });
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  };

  // Logout function
  const logout = async (logoutAllSessions: boolean = false): Promise<void> => {
    await handleLogout(logoutAllSessions);
  };

  // Verify email function
  // Enhanced verifyEmail function
const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; message: string }> => {
  try {
    safeSetState(() => setIsLoading(true));

    const response = await fetch('/api/auth/verifyemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (response.ok) {
      const { token, sessionToken: returnedSessionToken } = data;
      
      // Store tokens synchronously
      storage.setItem('authToken', token);
      if (returnedSessionToken) {
        storage.setItem('sessionToken', returnedSessionToken);
      }
      
      // Update state
      safeSetState(() => {
        setSessionToken(returnedSessionToken);
        setIsAuthenticated(true);
        setAuthState(AuthState.AUTHENTICATED);
        setIsLoading(false);
      });

      // Wait for state to be fully updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('Email verification successful, auth state updated');
      return { success: true, message: 'Email verified successfully!' };
    } else {
      safeSetState(() => setIsLoading(false));
      return { success: false, message: data.message || 'Verification failed' };
    }
  } catch (error) {
    console.error('Verification error:', error);
    safeSetState(() => setIsLoading(false));
    return { success: false, message: 'Network error. Please try again.' };
  }
};

  // Forgot password function
  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      safeSetState(() => setIsLoading(true));

      const response = await fetch('/api/auth/forgotten-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return response.ok 
        ? { success: true, message: 'Password reset link sent to your email!' }
        : { success: false, message: data.message || 'Failed to send reset email' };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  };

  // Reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      safeSetState(() => setIsLoading(true));

      const response = await fetch('/api/auth/resetpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      return response.ok 
        ? { success: true, message: 'Password reset successful!' }
        : { success: false, message: data.message || 'Password reset failed' };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  };

  // Resend verification function
  const resendVerification = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      safeSetState(() => setIsLoading(true));

      const response = await fetch('/api/auth/resendverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return response.ok 
        ? { success: true, message: 'Verification code sent!' }
        : { success: false, message: data.message || 'Failed to resend verification' };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  };

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    authState,
    sessionToken,
    checkAuthStatus,
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