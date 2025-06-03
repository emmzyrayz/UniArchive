// /contexts/AdminContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UniversityInput } from '@/models/universitySchema';
import { useUser } from './userContext';

interface AdminContextType {
  universities: UniversityInput[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  uploadUniversity: (universityData: UniversityInput) => Promise<boolean>;
  fetchUniversities: () => Promise<void>;
  deleteUniversity: (universityId: string) => Promise<boolean>;
  clearError: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: React.ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [universities, setUniversities] = useState<UniversityInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userProfile, hasActiveSession, userState } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin based on their role
  useEffect(() => {
    setIsAdmin(userProfile?.role === 'admin' || userProfile?.role === 'mod');
  }, [userProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper function to check admin privileges
  const checkAdminPrivileges = useCallback((): boolean => {
    if (userState !== 'active_session' || !hasActiveSession || !userProfile) {
      setError('You must be logged in to perform this action');
      return false;
    }
    
    if (userProfile.role !== 'admin' && userProfile.role !== 'mod') {
      setError('You do not have admin privileges');
      return false;
    }
    
    return true;
  }, [userState, hasActiveSession, userProfile]);

  const uploadUniversity = useCallback(async (universityData: UniversityInput): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get token from storage (you may need to adjust this based on your token storage implementation)
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const response = await fetch('/api/admin/school/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(universityData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to upload university');
      }

      // Add the new university to local state
      setUniversities(prev => [...prev, universityData]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Upload university error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges]);

  const fetchUniversities = useCallback(async (): Promise<void> => {
    if (!checkAdminPrivileges()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const response = await fetch('/api/admin/school/view', {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch universities');
      }

      setUniversities(result.universities || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Fetch universities error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges]);

  const deleteUniversity = useCallback(async (universityId: string): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const response = await fetch(`/api/admin/school/delete/${universityId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete university');
      }

      // Remove the university from local state
      setUniversities(prev => prev.filter(uni => uni.id !== universityId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Delete university error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges]);

  const value: AdminContextType = {
    universities,
    isLoading,
    error,
    isAdmin,
    uploadUniversity,
    fetchUniversities,
    deleteUniversity,
    clearError,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};