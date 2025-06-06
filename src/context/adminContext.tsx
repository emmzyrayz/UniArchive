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
  uploadProgress: number;
  uploadUniversity: (universityData: UniversityInput) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string | null>;
  fetchUniversities: () => Promise<void>;
  deleteUniversity: (universityId: string) => Promise<boolean>;
  updateUniversity: (universityId: string, universityData: Partial<UniversityInput>) => Promise<boolean>;
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
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // Upload image to Cloudinary - FIXED: Remove Authorization header since we're using cookie-based auth
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!checkAdminPrivileges()) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // FIXED: Remove Authorization header - the API route will use cookie-based auth
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        // Credentials are automatically included for same-origin requests
        credentials: 'include', // Ensure cookies are sent
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      return result.imageUrl || result.url; // Handle different response formats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image upload failed';
      setError(errorMessage);
      console.error('Upload image error:', err);
      return null;
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [checkAdminPrivileges]);

  const uploadUniversity = useCallback(async (universityData: UniversityInput): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // FIXED: Remove Authorization header - use cookie-based auth
      const response = await fetch('/api/admin/school/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(universityData),
        credentials: 'include', // Ensure cookies are sent
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
      // FIXED: Remove Authorization header - use cookie-based auth
      const response = await fetch('/api/admin/school/view', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch universities');
      }

      setUniversities(result.universities || result.schools || []);
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
      // FIXED: Remove Authorization header - use cookie-based auth
      const response = await fetch(`/api/admin/school/delete/${universityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
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

  const updateUniversity = useCallback(async (universityId: string, universityData: Partial<UniversityInput>): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // FIXED: Remove Authorization header - use cookie-based auth
      const response = await fetch(`/api/admin/school/update/${universityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(universityData),
        credentials: 'include', // Ensure cookies are sent
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update university');
      }

      // Update the university in local state
      setUniversities(prev => 
        prev.map(uni => 
          uni.id === universityId 
            ? { ...uni, ...universityData }
            : uni
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Update university error:', err);
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
    uploadProgress,
    uploadUniversity,
    uploadImage,
    fetchUniversities,
    deleteUniversity,
    updateUniversity,
    clearError,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};