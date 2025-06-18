// /context/courseContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ICourse, CourseOutlineWeek} from '@/models/courseModel';
import { useUser } from './userContext';

interface Course extends ICourse {
  _id: string;
  status?: 'approved' | 'pending' | 'rejected';
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
  totalCourses: number;
  approvedCourses: number;
  pendingCourses: number;
}

// Remove legacy WeeklyOutline interface (now using CourseOutlineWeek from model)

interface CourseContextType {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  pagination: PaginationInfo | null;
  statistics: Statistics | null;
  fetchCourses: (params?: FetchParams) => Promise<void>;
  uploadCourse: (courseData: Partial<ICourse>) => Promise<boolean>;
  updateCourse: (courseId: string, courseData: Partial<ICourse>) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  clearError: () => void;
  isInitialized: boolean;
}

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  facultyId?: string;
  schoolId?: string;
  status?: string;
  semester?: string;
  level?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Legacy interface for backward compatibility
interface LegacyWeekOutline {
  week: number;
  topic: string;
  subtopics: string[];
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

interface CourseProviderProps {
  children: React.ReactNode;
}

// Helper function to generate unique IDs
const generateUniqueId = (prefix: string, existingIds: Set<string>): string => {
  let counter = 1;
  let id = `${prefix}-${counter}`;
  while (existingIds.has(id)) {
    counter++;
    id = `${prefix}-${counter}`;
  }
  existingIds.add(id);
  return id;
};

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const { userProfile, hasActiveSession, userState } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminStatus = userProfile?.role === 'admin' || userProfile?.role === 'mod';
    setIsAdmin(adminStatus);
  }, [userProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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

   // FIXED: Helper function to ensure courseOutline compatibility with unique keys
  const normalizeCourseOutline = useCallback((
    courseOutline: CourseOutlineWeek[] | string | LegacyWeekOutline[] | string[] | null | undefined
  ): CourseOutlineWeek[] => {
    if (!courseOutline || (Array.isArray(courseOutline) && courseOutline.length === 0)) {
      return [];
    }
    
    // Track used IDs to ensure uniqueness
    const usedWeekIds = new Set<string>();
    const usedTopicIds = new Set<string>();
    const usedSubtopicIds = new Set<string>();
    
    // Already in new format - but need to ensure unique IDs
    if (Array.isArray(courseOutline) && courseOutline[0] && typeof courseOutline[0] === 'object' && 'weekId' in courseOutline[0]) {
      return (courseOutline as CourseOutlineWeek[]).map((week, weekIdx) => {
        // Ensure unique weekId
        const weekId = week.weekId && !usedWeekIds.has(week.weekId) 
          ? week.weekId 
          : generateUniqueId('week', usedWeekIds);
        
        return {
          weekId,
          index: weekIdx + 1, // Always sequential based on array position
          topics: week.topics.map((topic, topicIdx) => {
            // Ensure unique topicId
            const topicId = topic.id && !usedTopicIds.has(topic.id)
              ? topic.id
              : generateUniqueId(`topic-${weekIdx + 1}`, usedTopicIds);
            
            return {
              id: topicId,
              name: topic.name || '',
              subtopics: (topic.subtopics || []).map((subtopic) => {
                // Ensure unique subtopicId
                const subtopicId = subtopic.id && !usedSubtopicIds.has(subtopic.id)
                  ? subtopic.id
                  : generateUniqueId(`subtopic-${weekIdx + 1}-${topicIdx + 1}`, usedSubtopicIds);
                
                return {
                  id: subtopicId,
                  name: subtopic.name || ''
                };
              })
            };
          })
        };
      });
    }
    
    // Legacy: array of {week, topic, subtopics}
    if (Array.isArray(courseOutline) && courseOutline[0] && typeof courseOutline[0] === 'object' && 'week' in courseOutline[0]) {
      return (courseOutline as LegacyWeekOutline[]).map((w, idx) => {
        const weekId = generateUniqueId('week', usedWeekIds);
        const topicId = generateUniqueId(`topic-${idx + 1}`, usedTopicIds);
        
        return {
          weekId,
          index: idx + 1,
          topics: [
            {
              id: topicId,
              name: w.topic || '',
              subtopics: (w.subtopics || []).map((s: string) => ({
                id: generateUniqueId(`subtopic-${idx + 1}-1`, usedSubtopicIds),
                name: s
              }))
            }
          ]
        };
      });
    }
    
    // Legacy: array of strings
    if (Array.isArray(courseOutline) && typeof courseOutline[0] === 'string') {
      return (courseOutline as string[]).map((topic: string, idx: number) => {
        const weekId = generateUniqueId('week', usedWeekIds);
        const topicId = generateUniqueId(`topic-${idx + 1}`, usedTopicIds);
        
        return {
          weekId,
          index: idx + 1,
          topics: [
            {
              id: topicId,
              name: topic,
              subtopics: []
            }
          ]
        };
      });
    }
    
    // JSON string
    if (typeof courseOutline === 'string') {
      try {
        const parsed = JSON.parse(courseOutline);
        return normalizeCourseOutline(parsed);
      } catch {
        return [];
      }
    }
    
    // Fallback: try to coerce
    if (Array.isArray(courseOutline)) {
      return courseOutline.map((item: unknown, idx: number) => {
        const weekId = generateUniqueId('week', usedWeekIds);
        const topicId = generateUniqueId(`topic-${idx + 1}`, usedTopicIds);
        
        return {
          weekId,
          index: idx + 1,
          topics: [
            {
              id: topicId,
              name: String(item),
              subtopics: []
            }
          ]
        };
      });
    }
    
    return [];
  }, []);

  const fetchCourses = useCallback(async (params: FetchParams = {}): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.departmentId) queryParams.append('departmentId', params.departmentId);
      if (params.facultyId) queryParams.append('facultyId', params.facultyId);
      if (params.schoolId) queryParams.append('schoolId', params.schoolId);
      if (params.status) queryParams.append('status', params.status);
      if (params.semester) queryParams.append('semester', params.semester);
      if (params.level) queryParams.append('level', params.level);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      const url = `/api/admin/course/view?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.status === 401) {
        setError('Session expired. Please login again');
        setCourses([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }
      if (response.status === 403) {
        setError('Insufficient privileges. Admin access required');
        setCourses([]);
        setPagination(null);
        setStatistics(null);
        setIsInitialized(true);
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch courses');
      }

      // Normalize course outlines for compatibility with unique keys
      const fetchedCourses = (result.courses || []).map((course: Course) => ({
        ...course,
        courseOutline: normalizeCourseOutline(course.courseOutline)
      }));

      console.log('=== NORMALIZED COURSES DEBUG ===');
      fetchedCourses.forEach((course: Course, idx: number) => {
        console.log(`Course ${idx + 1} - ${course.courseName}:`);
        course.courseOutline.forEach((week: CourseOutlineWeek) => {
          console.log(`  Week: ${week.weekId} (index: ${week.index})`);
          week.topics.forEach((topic) => {
            console.log(`    Topic: ${topic.id} - ${topic.name}`);
            if (topic.subtopics && topic.subtopics.length > 0) {
              topic.subtopics.forEach((subtopic) => {
                console.log(`      Subtopic: ${subtopic.id} - ${subtopic.name}`);
              });
            }
          });
        });
      });

      setCourses(fetchedCourses);
      setPagination(result.pagination || null);
      setStatistics(result.statistics || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setCourses([]);
      setPagination(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [normalizeCourseOutline]);

  const uploadCourse = useCallback(async (courseData: Partial<ICourse>): Promise<boolean> => {
    if (!checkAdminPrivileges()) return false;

    setIsLoading(true);
    setError(null);

    try {
       // Validate required fields
      if (!courseData.courseName || !courseData.courseCode || !courseData.departmentId) {
        throw new Error('Missing required fields: courseName, courseCode, or departmentId');
      }

      // Ensure courseOutline is properly formatted with unique keys
      const processedData = {
        ...courseData,
        courseOutline: normalizeCourseOutline(courseData.courseOutline || [])
      };

      const response = await fetch('/api/admin/course/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to upload course');

      await fetchCourses();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchCourses, normalizeCourseOutline]);

  const updateCourse = useCallback(async (courseId: string, courseData: Partial<ICourse>): Promise<boolean> => {
    if (!checkAdminPrivileges()) return false;
    setIsLoading(true);
    setError(null);
    try {
      // Ensure courseOutline is properly formatted with unique keys
      const processedData = {
        ...courseData,
        courseOutline: normalizeCourseOutline(courseData.courseOutline || [])
      };

      const response = await fetch(`/api/admin/course/update/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
        credentials: 'include',
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update course');
      await fetchCourses();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchCourses, normalizeCourseOutline]);

  const deleteCourse = useCallback(async (courseId: string): Promise<boolean> => {
    if (!checkAdminPrivileges()) return false;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/course/delete/${courseId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete course');
      await fetchCourses();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPrivileges, fetchCourses]);

  useEffect(() => {
    if (userState === 'active_session' && hasActiveSession && !isInitialized) {
      fetchCourses({ page: 1, limit: 10 });
    }
  }, [userState, hasActiveSession, isInitialized, fetchCourses]);

  const value: CourseContextType = {
    courses,
    isLoading,
    error,
    isAdmin,
    pagination,
    statistics,
    fetchCourses,
    uploadCourse,
    updateCourse,
    deleteCourse,
    clearError,
    isInitialized,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};