// /context/materialContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from './userContext';
import { useCourse } from './courseContext';
import { Material, MaterialInput } from '@/models/materialModel';
import { ICourse } from '@/models/courseModel';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Statistics {
  totalMaterials: number;
  approvedMaterials: number;
  pendingMaterials: number;
}

interface CloudUploadResult {
  success: boolean;
  url: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  publicId?: string; // For Cloudinary images
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  fileName: string;
  error?: string;
}

interface UploadLimits {
  maxFileSize: number; // in bytes
  maxFilesPerDay: number;
  maxFilesPerMonth: number;
  allowedFileTypes: string[];
}

interface MaterialContextType {
  materials: Material[];
  isLoading: boolean;
  error: string | null;
  // Separate permission states
  isAdmin: boolean;
  isModerator: boolean;
  isContributor: boolean;
  canUpload: boolean;
  canModerate: boolean;
  uploadLimits: UploadLimits | null;
  pagination: PaginationInfo | null;
  statistics: Statistics | null;
  uploadProgress: UploadProgress | null;
  fetchMaterials: (params?: FetchParams) => Promise<void>;
  uploadMaterial: (materialData: FormData | Partial<MaterialInput>) => Promise<boolean>;
  uploadMaterialWithFile: (file: File, materialData: Partial<MaterialInput>) => Promise<boolean>;
  updateMaterial: (materialId: string, materialData: Partial<MaterialInput>) => Promise<boolean>;
  deleteMaterial: (materialId: string) => Promise<boolean>;
  approveMaterial: (materialId: string) => Promise<boolean>;
  rejectMaterial: (materialId: string, reason?: string) => Promise<boolean>;
  clearError: () => void;
  isInitialized: boolean;
  departmentCourses: ICourse[];
  checkCanEditMaterial: (material: Material) => boolean;
  uploadFileToCloud: (file: File) => Promise<CloudUploadResult>;
}

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: string;
  uploaderUpid?: string;
  status?: string;
  materialType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const MaterialContext = createContext<MaterialContextType | undefined>(undefined);

export const useMaterial = () => {
  const context = useContext(MaterialContext);
  if (context === undefined) {
    throw new Error('useMaterial must be used within a MaterialProvider');
  }
  return context;
};

interface MaterialProviderProps {
  children: React.ReactNode;
}

export const MaterialProvider: React.FC<MaterialProviderProps> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const { userProfile, hasActiveSession, userState } = useUser();
  
  // Separate permission states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [uploadLimits, setUploadLimits] = useState<UploadLimits | null>(null);

  // Department courses state
  const { courses, fetchCourses, isInitialized: coursesInitialized } = useCourse();
  const [departmentCourses, setDepartmentCourses] = useState<ICourse[]>([]);
  
  // FIXED: Use refs to track if we've already fetched courses for this department
  const lastFetchedDepartmentRef = useRef<string | null>(null);
  const coursesFetchedRef = useRef<boolean>(false);

  // Update permission states when userProfile changes
  useEffect(() => {
    console.log('=== MATERIALCONTEXT USER DEBUG ===');
    console.log('userProfile changed:', {
      exists: !!userProfile,
      fullName: userProfile?.fullName,
      upid: userProfile?.upid,
      role: userProfile?.role,
      school: userProfile?.school,
      faculty: userProfile?.faculty,
      department: userProfile?.department,
      level: userProfile?.level
    });
    console.log('userState:', userState);
    console.log('hasActiveSession:', hasActiveSession);
    console.log('===================================');

    if (userProfile) {
      const role = userProfile.role;
      const adminStatus = role === 'admin';
      const modStatus = role === 'mod';
      const contributorStatus = role === 'contributor';
      const uploadStatus = ['admin', 'mod', 'contributor'].includes(role);
      const moderateStatus = ['admin', 'mod'].includes(role);

      console.log('Permission states:', {
        role,
        adminStatus,
        modStatus,
        contributorStatus,
        uploadStatus,
        moderateStatus
      });

      setIsAdmin(adminStatus);
      setIsModerator(modStatus);
      setIsContributor(contributorStatus);
      setCanUpload(uploadStatus);
      setCanModerate(moderateStatus);

      // Set upload limits based on role
      const limits: UploadLimits = {
        maxFileSize: role === 'admin' ? 500 * 1024 * 1024 : // 500MB for admin
                     role === 'mod' ? 200 * 1024 * 1024 : // 200MB for mod
                     50 * 1024 * 1024, // 50MB for contributor
        maxFilesPerDay: role === 'admin' ? 100 :
                       role === 'mod' ? 50 :
                       10, // contributor limit
        maxFilesPerMonth: role === 'admin' ? 1000 :
                         role === 'mod' ? 500 :
                         100, // contributor limit
        allowedFileTypes: role === 'admin' ? ['application/pdf', 'image/*', 'video/*'] :
                         role === 'mod' ? ['application/pdf', 'image/*', 'video/*'] :
                         ['application/pdf', 'image/jpeg', 'image/png'] // contributor limited to PDF and common images
      };
      setUploadLimits(limits);
    } else {
      // Reset all permissions when no user
      console.log('Resetting permissions - no user profile');
      setIsAdmin(false);
      setIsModerator(false);
      setIsContributor(false);
      setCanUpload(false);
      setCanModerate(false);
      setUploadLimits(null);
    }
  }, [userProfile, userState, hasActiveSession]);

  // FIXED: Fetch department courses only when necessary
  useEffect(() => {
    const currentDepartment = userProfile?.department;
    
    if (
      currentDepartment && 
      userState === 'active_session' && 
      hasActiveSession && 
      coursesInitialized &&
      // Only fetch if we haven't fetched for this department yet
      lastFetchedDepartmentRef.current !== currentDepartment
    ) {
      lastFetchedDepartmentRef.current = currentDepartment;
      coursesFetchedRef.current = true;
      
      fetchCourses({ departmentId: currentDepartment }).catch((error) => {
        console.error('Failed to fetch department courses:', error);
        // Reset the ref so we can try again
        lastFetchedDepartmentRef.current = null;
        coursesFetchedRef.current = false;
      });
    } else if (!currentDepartment) {
      // Clear department courses and reset tracking when no department
      setDepartmentCourses([]);
      lastFetchedDepartmentRef.current = null;
      coursesFetchedRef.current = false;
    }
  }, [userProfile?.department, userState, hasActiveSession, coursesInitialized, fetchCourses]);

  // FIXED: Separate effect to update departmentCourses when courses change
  useEffect(() => {
    const currentDepartment = userProfile?.department;
    
    if (currentDepartment && coursesFetchedRef.current) {
      const filteredCourses = courses.filter(
        (course: ICourse) => course.departmentId === currentDepartment
      );
      setDepartmentCourses(filteredCourses);
    } else {
      setDepartmentCourses([]);
    }
  }, [courses, userProfile?.department]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if user can edit a specific material
  const checkCanEditMaterial = useCallback((material: Material): boolean => {
    if (!userProfile || userState !== 'active_session' || !hasActiveSession) {
      return false;
    }
    
    // Admins and mods can edit any material
    if (isAdmin || isModerator) {
      return true;
    }
    
    // Contributors can only edit their own materials
    if (isContributor && material.uploaderUpid === userProfile.upid) {
      return true;
    }
    
    return false;
  }, [userProfile, userState, hasActiveSession, isAdmin, isModerator, isContributor]);

  // Enhanced privilege checking functions
  const checkAdminPrivileges = useCallback((): boolean => {
    if (userState !== 'active_session' || !hasActiveSession || !userProfile) {
      setError('You must be logged in to perform this action');
      return false;
    }
    if (!canModerate) {
      setError('You do not have admin/moderator privileges');
      return false;
    }
    return true;
  }, [userState, hasActiveSession, userProfile, canModerate]);

  const checkUploadPrivileges = useCallback((): boolean => {
     console.log('Checking upload privileges:', {
      userState,
      hasActiveSession,
      userProfile: !!userProfile,
      canUpload,
      userRole: userProfile?.role
    });

    if (userState !== 'active_session') {
      const msg = `Invalid user state: ${userState}. Expected: active_session`;
      console.error(msg);
      setError('You must be logged in to perform this action');
      return false;
    }

    if (!hasActiveSession) {
      console.error('No active session');
      setError('You must be logged in to perform this action');
      return false;
    }

    if (!userProfile) {
      console.error('No user profile available');
      setError('User profile not loaded. Please refresh and try again.');
      return false;
    }

    if (!canUpload) {
      console.error('User does not have upload privileges:', {
        role: userProfile.role,
        canUpload
      });
      setError('You do not have upload privileges');
      return false;
    }

    console.log('Upload privileges check passed');
    return true;
  }, [userState, hasActiveSession, userProfile, canUpload]);

  const checkEditPrivileges = useCallback((material: Material): boolean => {
    if (userState !== 'active_session' || !hasActiveSession || !userProfile) {
      setError('You must be logged in to perform this action');
      return false;
    }
    
    if (!checkCanEditMaterial(material)) {
      setError('You do not have permission to edit this material');
      return false;
    }
    
    return true;
  }, [userState, hasActiveSession, userProfile, checkCanEditMaterial]);

  // Validate file against upload limits
  const validateFileUpload = useCallback((file: File): boolean => {
    if (!uploadLimits) {
      setError('Upload limits not available');
      return false;
    }

    // Check file size
    if (file.size > uploadLimits.maxFileSize) {
      const maxSizeMB = Math.round(uploadLimits.maxFileSize / (1024 * 1024));
      setError(`File size exceeds limit of ${maxSizeMB}MB`);
      return false;
    }

    // Check file type
    const isAllowedType = uploadLimits.allowedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isAllowedType) {
      setError(`File type ${file.type} is not allowed for your role`);
      return false;
    }

    return true;
  }, [uploadLimits]);

  // Determine file type and upload endpoint
  const getUploadEndpoint = (file: File): string => {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return '/api/admin/upload-image';
    } else if (mimeType === 'application/pdf') {
      return '/api/admin/upload-file';
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Only images and PDFs are allowed.`);
    }
  };

  // Upload file to cloud storage
  const uploadFileToCloud = useCallback(async (file: File): Promise<CloudUploadResult> => {
    if (!validateFileUpload(file)) {
      throw new Error('File validation failed');
    }

    const endpoint = getUploadEndpoint(file);
    
    setUploadProgress({
      isUploading: true,
      progress: 0,
      fileName: file.name,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      // Handle different response formats from different endpoints
      let cloudResult: CloudUploadResult;

      if (endpoint.includes('upload-image')) {
        // Cloudinary response format
        cloudResult = {
          success: result.success,
          url: result.imageUrl,
          fileName: result.publicId,
          originalName: file.name,
          fileSize: result.bytes,
          mimeType: file.type,
          publicId: result.publicId,
        };
      } else {
        // Backblaze response format
        cloudResult = {
          success: result.success,
          url: result.data.fileUrl,
          fileName: result.data.fileName,
          originalName: result.data.originalName,
          fileSize: file.size,
          mimeType: file.type,
        };
      }

      setUploadProgress({
        isUploading: true,
        progress: 100,
        fileName: file.name,
      });

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 1000);

      return cloudResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadProgress({
        isUploading: false,
        progress: 0,
        fileName: file.name,
        error: errorMessage,
      });

      // Clear error progress after delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);

      throw error;
    }
  }, [validateFileUpload]);

  const fetchMaterials = useCallback(async (params: FetchParams = {}): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.courseId) queryParams.append('courseId', params.courseId);
      if (params.uploaderUpid) queryParams.append('uploaderUpid', params.uploaderUpid);
      if (params.status) queryParams.append('status', params.status);
      if (params.materialType) queryParams.append('materialType', params.materialType);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const url = `/api/admin/material/view?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.status === 401) {
        setError('Session expired. Please login again');
        setMaterials([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }
      
      if (response.status === 403) {
        setError('Insufficient privileges. Admin access required');
        setMaterials([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch materials');
      }
      
      setMaterials(result.materials || []);
      setPagination(result.pagination || null);
      setStatistics(result.statistics || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setMaterials([]);
      setPagination(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // New method: Upload material with file
  const uploadMaterialWithFile = useCallback(async (
    file: File, 
    materialData: Partial<MaterialInput>
  ): Promise<boolean> => {
    if (!checkUploadPrivileges()) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First, upload the file to cloud storage
      const cloudResult = await uploadFileToCloud(file);
      
      if (!cloudResult.success) {
        throw new Error('Failed to upload file to cloud storage');
      }

       // Prepare material data with cloud storage information
    const enhancedMaterialData = {
      ...materialData,
      materialUrl: cloudResult.url,
      fileName: cloudResult.originalName,
      fileSize: cloudResult.fileSize,
      mimeType: cloudResult.mimeType,
      cloudFileName: cloudResult.fileName,
      ...(cloudResult.publicId && { cloudPublicId: cloudResult.publicId }),
      // Contributors' materials start as PENDING, admin/mod materials are auto-approved
      status: isContributor ? 'PENDING' : 'APPROVED',
      isApproved: !isContributor, // Only auto-approve for admin/mod
      // Add required uploader information if missing
      uploaderName: materialData.uploaderName || userProfile?.fullName,
      uploaderUpid: materialData.uploaderUpid || userProfile?.upid,
      uploaderRole: materialData.uploaderRole || userProfile?.role,
      courseName: materialData.courseName // Make sure this is provided
    };

      // Validate required fields
    if (!enhancedMaterialData.materialTitle || !enhancedMaterialData.materialType || !enhancedMaterialData.courseId) {
      throw new Error('Missing required fields: materialTitle, materialType, or courseId');
    }

    // Validate uploader information
    if (!enhancedMaterialData.uploaderName || !enhancedMaterialData.uploaderUpid || !enhancedMaterialData.uploaderRole) {
      throw new Error('Missing uploader information');
    }

    console.log('Submitting material data:', {
      materialTitle: enhancedMaterialData.materialTitle,
      materialType: enhancedMaterialData.materialType,
      courseId: enhancedMaterialData.courseId,
      uploaderUpid: enhancedMaterialData.uploaderUpid,
      hasUrl: !!enhancedMaterialData.materialUrl
    });

       // Submit material data to the API - ENSURE JSON Content-Type
    const response = await fetch('/api/admin/material/upload', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(enhancedMaterialData),
      credentials: 'include',
    });

      if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload response error:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      } catch {
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }
    }

      const result = await response.json();
      console.log('Upload successful:', result);
      

      // Refresh materials list
      await fetchMaterials();
      return true;

    } catch (err) {
     console.error('Upload error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    setError(errorMessage);
    return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkUploadPrivileges, uploadFileToCloud, fetchMaterials, isContributor, userProfile]);

  const uploadMaterial = useCallback(async (materialData: FormData | Partial<MaterialInput>): Promise<boolean> => {
    console.log('=== UPLOAD MATERIAL DEBUG START ===');

    if (!checkUploadPrivileges()) {
      console.error('Upload privileges check failed');
      return false;
    }

    // Enhanced validation for FormData
    if (materialData instanceof FormData) {
      console.log('Processing FormData upload');
      
      // Debug: Log all FormData entries
      const formDataEntries: Record<string, unknown> = {};
      for (const [key, value] of materialData.entries()) {
        if (value instanceof File) {
          formDataEntries[key] = `File: ${value.name} (${value.size} bytes)`;
        } else {
          formDataEntries[key] = value;
        }
      }
      console.log('FormData entries:', formDataEntries);

      // Validate required fields in FormData
      const requiredFields = ['materialTitle', 'materialType', 'courseId', 'uploaderName', 'uploaderUpid', 'uploaderRole'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!materialData.has(field) || !materialData.get(field)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        console.error(errorMsg);
        setError(errorMsg);
        return false;
      }

      // Additional validation
      const materialTitle = materialData.get('materialTitle') as string;
      const courseId = materialData.get('courseId') as string;
      const uploaderUpid = materialData.get('uploaderUpid') as string;

      if (!materialTitle || materialTitle.trim() === '') {
        setError('Material title cannot be empty');
        return false;
      }

      if (!courseId || courseId.trim() === '') {
        setError('Course ID is required');
        return false;
      }

      if (!uploaderUpid || uploaderUpid.trim() === '') {
        setError('Uploader ID is required');
        return false;
      }

      console.log('FormData validation passed');
    } else {
      console.log('Processing JSON upload');
      console.log('Material data:', materialData);

      // Validate JSON data
      if (!materialData.materialTitle || !materialData.materialType || !materialData.courseId) {
        const errorMsg = 'Missing required fields: materialTitle, materialType, or courseId';
        console.error(errorMsg);
        setError(errorMsg);
        return false;
      }

      if (!materialData.uploaderName || !materialData.uploaderUpid || !materialData.uploaderRole) {
        const errorMsg = 'Missing uploader information';
        console.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      let response: Response;

      // Check if materialData is FormData (for file uploads) or regular object
     if (materialData instanceof FormData) {
        console.log('Sending FormData request...');
        response = await fetch('/api/admin/material/upload', {
          method: 'POST',
          body: materialData,
          credentials: 'include',
        });
      } else {
        console.log('Sending JSON request...');
        // Set approval status based on role
        const enhancedData = {
          ...materialData,
          status: isContributor ? 'PENDING' : 'APPROVED',
          isApproved: !isContributor,
        };
        
        console.log('Enhanced data being sent:', enhancedData);
        
        response = await fetch('/api/admin/material/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(enhancedData),
          credentials: 'include',
        });
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Upload failed with status ${response.status}`;
        } catch {
          errorMessage = `Upload failed with status ${response.status}: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      // Refresh materials list
      await fetchMaterials();
      
      console.log('=== UPLOAD MATERIAL DEBUG END ===');

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkUploadPrivileges, fetchMaterials, isContributor]);

  const updateMaterial = useCallback(async (materialId: string, materialData: Partial<MaterialInput>): Promise<boolean> => {
    // Find the material to check edit permissions
    const material = materials.find(m => m._id === materialId);
    if (!material) {
      setError('Material not found');
      return false;
    }

    if (!checkEditPrivileges(material)) return false;
    
    setIsLoading(true);
    setError(null);
    try {
      // Contributors editing their own materials should reset approval status
      const enhancedData = isContributor && material.uploaderUpid === userProfile?.upid ? {
        ...materialData,
        status: 'PENDING',
        isApproved: false,
      } : materialData;

      const response = await fetch(`/api/admin/material/update/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedData),
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update material');
      await fetchMaterials();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [materials, checkEditPrivileges, fetchMaterials, isContributor, userProfile]);

  const deleteMaterial = useCallback(async (materialId: string): Promise<boolean> => {
    // Find the material to check permissions
    const material = materials.find(m => m._id === materialId);
    if (!material) {
      setError('Material not found');
      return false;
    }

    // Contributors can delete their own materials, admins/mods can delete any
    const canDelete = canModerate || (isContributor && material.uploaderUpid === userProfile?.upid);
    if (!canDelete) {
      setError('You do not have permission to delete this material');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/material/delete/${materialId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete material');
      await fetchMaterials();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [materials, canModerate, isContributor, userProfile, fetchMaterials]);

  // New admin-only functions
  const approveMaterial = useCallback(async (materialId: string): Promise<boolean> => {
    if (!checkAdminPrivileges()) return false;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/material/approve/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to approve material');
      await fetchMaterials();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchMaterials]);

  const rejectMaterial = useCallback(async (materialId: string, reason?: string): Promise<boolean> => {
    if (!checkAdminPrivileges()) return false;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/material/reject/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to reject material');
      await fetchMaterials();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchMaterials]);

  useEffect(() => {
    if (userState === 'active_session' && hasActiveSession && !isInitialized) {
      fetchMaterials({ page: 1, limit: 10 });
    }
  }, [userState, hasActiveSession, isInitialized, fetchMaterials]);

  const value: MaterialContextType = {
    materials,
    isLoading,
    error,
    isAdmin,
    isModerator,
    isContributor,
    canUpload,
    canModerate,
    uploadLimits,
    pagination,
    statistics,
    uploadProgress,
    fetchMaterials,
    uploadMaterial,
    uploadMaterialWithFile,
    updateMaterial,
    deleteMaterial,
    approveMaterial,
    rejectMaterial,
    clearError,
    isInitialized,
    departmentCourses,
    checkCanEditMaterial,
    uploadFileToCloud,
  };

  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  );
};