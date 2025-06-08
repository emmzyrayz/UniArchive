// /contexts/AdminContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UniversityInput } from '@/models/universitySchema';
import { useUser } from './userContext';

// Updated interfaces to match the API response structure
interface University {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  membership: 'public' | 'private';
  level: 'federal' | 'state';
  usid: string; // Unique School ID
  psid: string; // Platform School ID (human-readable)
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  facultiesCount: number;
  departmentsCount: number;
  faculties: Faculty[];
  campuses: Campus[];
}

interface Campus{
   id: string;
  name: string;
  location: string;
  type: 'main' | 'branch' | 'satellite';
}

interface Faculty {
  id: string;
  name: string;
  departmentsCount: number;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Statistics {
  totalUniversities: number;
  activeUniversities: number;
  totalFaculties: number;
  totalDepartments: number;
}

interface AdminContextType {
  universities: University[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  uploadProgress: number;
  pagination: PaginationInfo | null;
  statistics: Statistics | null;
  uploadUniversity: (universityData: UniversityInput) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string | null>;
  fetchUniversities: (params?: FetchParams) => Promise<void>;
  deleteUniversity: (universityId: string) => Promise<boolean>;
  updateUniversity: (universityId: string, universityData: Partial<UniversityInput>) => Promise<boolean>;
  clearError: () => void;
  isInitialized: boolean;
}

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  membership?: 'public' | 'private' | 'federal' | 'state';
  level?: 'federal' | 'state';
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
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const { userProfile, hasActiveSession, userState } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin based on their role
  useEffect(() => {
    const adminStatus = userProfile?.role === 'admin' || userProfile?.role === 'mod';
    setIsAdmin(adminStatus);
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

  // Fetch universities function - defined before being used in other callbacks
  const fetchUniversities = useCallback(async (params: FetchParams = {}): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.location) queryParams.append('location', params.location);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.membership) queryParams.append('membership', params.membership);
      if (params.level) queryParams.append('level', params.level);

      const url = `/api/admin/school/view${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        setError('Session expired. Please login again');
        setUniversities([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }

      if (response.status === 403) {
        setError('Insufficient privileges. Admin access required');
        setUniversities([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch universities');
      }

      const fetchedUniversities = result.universities || [];
      setUniversities(fetchedUniversities);
      setPagination(result.pagination || null);
      setStatistics(result.statistics || null);
      
      console.log(`Fetched ${fetchedUniversities.length} universities from database`);
      console.log('Pagination:', result.pagination);
      console.log('Statistics:', result.statistics);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Fetch universities error:', err);
      setUniversities([]);
      setPagination(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Upload image to Cloudinary
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

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      return result.imageUrl || result.url;
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
      const response = await fetch('/api/admin/school/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(universityData),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to upload university');
      }

      console.log('University uploaded successfully:', result.university);
      
      // Refresh the universities list to include the new one with proper structure
      await fetchUniversities();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Upload university error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchUniversities]);

  const deleteUniversity = useCallback(async (universityId: string): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/school/delete/${universityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete university');
      }

      // Remove the university from local state
      setUniversities(prev => prev.filter(uni => uni.id !== universityId));
      
      // Update statistics if available
      if (statistics) {
        setStatistics(prev => prev ? {
          ...prev,
          totalUniversities: prev.totalUniversities - 1,
          activeUniversities: prev.activeUniversities - (universities.find(u => u.id === universityId)?.status === 'active' ? 1 : 0)
        } : null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Delete university error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, universities, statistics]);

  const updateUniversity = useCallback(async (universityId: string, universityData: Partial<UniversityInput>): Promise<boolean> => {
    if (!checkAdminPrivileges()) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Updating university:', universityId, 'with data:', universityData);

      const response = await fetch(`/api/admin/school/update/${universityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(universityData),
        credentials: 'include',
      });

      const result = await response.json();
      console.log('Update response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update university');
      }

      // Fix: Properly type the updated university data
      setUniversities(prev => 
        prev.map(uni => {
          if (uni.id === universityId) {
            // Create a properly typed update by spreading the existing university
            // and only updating the compatible properties
            const updatedUni: University = {
            ...uni,
            // Update all compatible fields
            name: universityData.name || uni.name,
            description: universityData.description || uni.description,
            location: universityData.location || uni.location,
            website: universityData.website || uni.website,
            logoUrl: universityData.logoUrl || uni.logoUrl,
            foundingYear: universityData.foundingYear || uni.foundingYear,
            membership: universityData.membership || uni.membership,
            level: universityData.level || uni.level,
            motto: universityData.motto || uni.motto,
            chancellor: universityData.chancellor || uni.chancellor,
            viceChancellor: universityData.viceChancellor || uni.viceChancellor,
            updatedAt: new Date(),
            // Update faculties and campuses if provided
            faculties: universityData.faculties ? universityData.faculties.map(f => ({
              id: f.id || '',
              name: f.name,
              departmentsCount: f.departments?.length || 0,
              departments: f.departments || []
            })) : uni.faculties,
            campuses: universityData.campuses ? universityData.campuses.map(c => ({
              id: c.id || '',
              name: c.name,
              location: c.location,
              type: c.type
            })) : uni.campuses,
          };
            return updatedUni;
          }
          return uni;
        })
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

  // Auto-fetch universities when the component mounts and user session is available
  useEffect(() => {
    if (userState === 'active_session' && hasActiveSession && !isInitialized) {
      console.log('Auto-fetching universities on session initialization...');
      fetchUniversities({ page: 1, limit: 10 });
    }
  }, [userState, hasActiveSession, isInitialized, fetchUniversities]);

  const value: AdminContextType = {
    universities,
    isLoading,
    error,
    isAdmin,
    uploadProgress,
    pagination,
    statistics,
    uploadUniversity,
    uploadImage,
    fetchUniversities,
    deleteUniversity,
    updateUniversity,
    clearError,
    isInitialized,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};