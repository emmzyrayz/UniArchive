// context/publicContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSchool } from "./schoolContext";
import { useCourse } from "./courseContext";
import { useMaterial } from "./materialContext";
import {
  Material,
  IPdfMaterial,
  IVideoMaterial,
  IImageMaterial,
} from "@/models/materialModel";
import { ICourse } from "@/models/courseModel";

interface UnifiedUniversity {
  id: string;
  name: string;
  location: string;
  website: string;
  logoUrl: string;
  faculties: UnifiedFaculty[];
}

interface UnifiedFaculty {
  id: string;
  name: string;
  universityId: string;
  departments: UnifiedDepartment[];
}

interface UnifiedDepartment {
  id: string;
  name: string;
  facultyId: string;
  courses: UnifiedCourse[];
}

interface UnifiedCourse {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  level?: string;
  semester?: string;
  creditUnits?: number;
  materials: UnifiedMaterial[];
  // Add other course fields as needed
}

interface UnifiedMaterial {
  id: string;
  title: string;
  type: string;
  url: string;
  courseId: string;
  description?: string;
  uploaderName?: string;
  createdAt?: string;
  fileSize?: number;
  // Add other material fields as needed
}

interface PublicContextType {
  unifiedData: UnifiedUniversity[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  getCachedData: () => UnifiedUniversity[] | null;
  isInitialized: boolean;
}

const PublicContext = createContext<PublicContextType | undefined>(undefined);

export const usePublic = () => {
  const context = useContext(PublicContext);
  if (context === undefined) {
    throw new Error("usePublic must be used within a PublicProvider");
  }
  return context;
};

interface PublicProviderProps {
  children: React.ReactNode;
}

export const PublicProvider: React.FC<PublicProviderProps> = ({ children }) => {
  const [unifiedData, setUnifiedData] = useState<UnifiedUniversity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    universities,
    isLoading: schoolsLoading,
    error: schoolsError,
    refresh: refreshSchools,
  } = useSchool();

  const {
    fetchPublicCourses,
    isLoading: coursesLoading,
    error: coursesError,
  } = useCourse();

  const {
    materials,
    fetchMaterials,
    isLoading: materialsLoading,
    error: materialsError,
  } = useMaterial();

  // Cache configuration - using sessionStorage to avoid localStorage restrictions
  const CACHE_KEY = "uniarchive_public_data";
  const CACHE_EXPIRY_KEY = "uniarchive_public_data_expiry";
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const getCachedData = useCallback((): UnifiedUniversity[] | null => {
    if (typeof window === "undefined") return null;

    try {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      const expiry = sessionStorage.getItem(CACHE_EXPIRY_KEY);

      if (!cachedData || !expiry) return null;

      const now = new Date().getTime();
      if (now > parseInt(expiry)) {
        // Cache expired
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_EXPIRY_KEY);
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      console.error("Error reading cached data:", error);
      return null;
    }
  }, []);

  const setCachedData = useCallback(
    (data: UnifiedUniversity[]) => {
      if (typeof window === "undefined") return;

      try {
        const now = new Date().getTime();
        const expiry = now + CACHE_DURATION;

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
      } catch (error) {
        console.error("Error caching data:", error);
      }
    },
    [CACHE_DURATION]
  );

  // NEW: Direct material fetching function to bypass materialContext limitations
  const fetchPublicMaterials = useCallback(async (): Promise<Material[]> => {
    try {
      console.log("📚 Fetching public materials directly...");

      const response = await fetch("/api/public/materials?limit=0", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch materials: ${response.status}`);
      }

      const result = await response.json();
      console.log(
        "📚 Public materials fetched:",
        result.materials?.length || 0
      );

      return result.materials || [];
    } catch (error) {
      console.error("❌ Error fetching public materials:", error);
      return [];
    }
  }, []);

  // Type guards for material types
  const isPdfMaterial = (material: Material): material is IPdfMaterial => {
    return material.materialType === "PDF";
  };

  const isVideoMaterial = (material: Material): material is IVideoMaterial => {
    return material.materialType === "VIDEO";
  };

  const isImageMaterial = (material: Material): material is IImageMaterial => {
    return material.materialType === "IMAGE";
  };

  // Helper function to get material URL based on type
  const getMaterialUrl = useCallback((material: Material): string => {
    if (isPdfMaterial(material)) {
      return (
        material.pdfUrl || material.signedUrl || material.materialUrl || ""
      );
    }

    if (isVideoMaterial(material)) {
      return (
        material.videoUrl || material.signedUrl || material.materialUrl || ""
      );
    }

    if (isImageMaterial(material)) {
      if (material.imageUrls && material.imageUrls.length > 0) {
        return material.imageUrls[0];
      }
      if (material.signedUrls && material.signedUrls.length > 0) {
        return material.signedUrls[0];
      }
      return material.materialUrl || "";
    }

    // Fallback
    throw new Error(
      `Unhandled material type: ${(material as Material).materialType}`
    );
  }, []);

  // Helper function to safely get material ID
  // const getMaterialId = useCallback((material: Material): string => {
  //   return material._id?.toString() || material.muid || "";
  // }, []);

  const buildUnifiedData = useCallback(async (): Promise<void> => {
    console.log("=== BUILDING UNIFIED DATA START ===");
    setIsLoading(true);
    setError(null);

    try {
      // First, check if we have cached data
      const cachedData = getCachedData();
      if (cachedData && cachedData.length > 0) {
        console.log(
          "Using cached unified data:",
          cachedData.length,
          "universities"
        );
        setUnifiedData(cachedData);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      console.log("No cached data found, building fresh data...");

      // Step 1: Ensure we have schools data
      if (!universities || universities.length === 0) {
        console.log("Fetching schools data...");
        await refreshSchools();
      }

      // Step 2: Fetch all approved courses (no pagination for complete dataset)
      console.log("Fetching courses data...");
      const coursesData = await fetchPublicCourses({
        limit: 0, // No pagination limit to get all courses
      });

      // Step 3: Fetch all approved materials (no pagination for complete dataset)
      console.log("Fetching materials data...");
      await fetchMaterials({
        status: "APPROVED",
        limit: 0, // No pagination limit to get all materials
      });

      // Step 4: Build the unified data structure
      console.log("Building unified structure...");
      console.log("Available data:", {
        universities: universities?.length || 0,
        courses: coursesData?.length || 0,
        materials: materials?.length || 0,
      });

      if (!universities || universities.length === 0) {
        throw new Error("No universities data available");
      }

      const unifiedUniversities: UnifiedUniversity[] = universities.map(
        (university) => {
          console.log(`Processing university: ${university.name}`);

          return {
            id: university.id,
            name: university.name,
            location: university.location,
            website: university.website,
            logoUrl: university.logoUrl,
            faculties: university.faculties.map((faculty) => {
              console.log(`  Processing faculty: ${faculty.name}`);

              return {
                id: faculty.id,
                name: faculty.name,
                universityId: university.id,
                departments: faculty.departments.map((department) => {
                  console.log(`    Processing department: ${department.name}`);

                  // Filter courses for this department
                  const departmentCourses = coursesData.filter(
                    (course: ICourse) => course.departmentId === department.id
                  );

                  console.log(
                    `      Found ${departmentCourses.length} courses for department ${department.name}`
                  );

                  return {
                    id: department.id,
                    name: department.name,
                    facultyId: faculty.id,
                    courses: departmentCourses.map((course) => {
                      // Filter materials for this course
                      const courseMaterials = materials.filter(
                        (material: Material) => material.courseId === course._id
                      );

                      console.log(
                        `        Found ${courseMaterials.length} materials for course ${course.courseName}`
                      );

                      return {
                        id: course._id,
                        name: course.courseName,
                        code: course.courseCode,
                        departmentId: course.departmentId,
                        level: course.level,
                        semester: course.semester,
                        // creditUnits: course.creditUnits,
                        materials: courseMaterials.map((material) => ({
                          id: String(material._id),
                          title: material.materialTitle,
                          type: material.materialType,
                          url: getMaterialUrl(material),
                          courseId: material.courseId,
                          description: material.materialDescription,
                          uploaderName: material.uploaderName,
                          createdAt: material.createdAt
                            ? material.createdAt.toISOString()
                            : undefined,
                          fileSize: material.fileSize,
                        })),
                      };
                    }),
                  };
                }),
              };
            }),
          };
        }
      );

      // Log summary
      const totalCourses = unifiedUniversities.reduce(
        (sum, uni) =>
          sum +
          uni.faculties.reduce(
            (fSum, fac) =>
              fSum +
              fac.departments.reduce(
                (dSum, dept) => dSum + dept.courses.length,
                0
              ),
            0
          ),
        0
      );

      const totalMaterials = unifiedUniversities.reduce(
        (sum, uni) =>
          sum +
          uni.faculties.reduce(
            (fSum, fac) =>
              fSum +
              fac.departments.reduce(
                (dSum, dept) =>
                  dSum +
                  dept.courses.reduce(
                    (cSum, course) => cSum + course.materials.length,
                    0
                  ),
                0
              ),
            0
          ),
        0
      );

      console.log("Unified data built successfully:", {
        universities: unifiedUniversities.length,
        totalCourses,
        totalMaterials,
      });

      // Cache the unified data only if we have meaningful data
      if (totalCourses > 0 || unifiedUniversities.length > 0) {
        setCachedData(unifiedUniversities);
      }

      setUnifiedData(unifiedUniversities);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to build unified data";
      console.error("Build unified data error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log("=== BUILDING UNIFIED DATA END ===");
    }
  }, [
    getCachedData,
    refreshSchools,
    fetchPublicCourses,
    fetchMaterials,
    universities,
    materials,
    setCachedData,
    getMaterialUrl,
  ]);

  const refreshData = useCallback(async () => {
    console.log("Refreshing unified data...");
    // Clear cache and rebuild data
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_EXPIRY_KEY);
    }
    await buildUnifiedData();
  }, [buildUnifiedData]);

  // Initialize data when all contexts have data available
  useEffect(() => {
    console.log("PublicContext useEffect triggered:", {
      universitiesCount: universities?.length || 0,
      materialsCount: materials?.length || 0,
      isInitialized,
      isLoading,
      schoolsLoading,
    });

    // Only build data if we have universities data and we haven't initialized yet
    if (
      universities &&
      universities.length > 0 &&
      !isInitialized &&
      !isLoading &&
      !schoolsLoading
    ) {
      console.log("Conditions met, building unified data...");
      buildUnifiedData();
    }
  }, [
    universities,
    materials,
    isInitialized,
    isLoading,
    schoolsLoading,
    buildUnifiedData,
  ]);

  // Combined loading state
  const combinedLoading =
    isLoading ||
    schoolsLoading ||
    coursesLoading ||
    schoolsLoading ||
    materialsLoading;

  // Combined error state
  const combinedError = error || schoolsError || coursesError || materialsError;

  const value: PublicContextType = {
    unifiedData,
    isLoading: combinedLoading,
    error: combinedError,
    refreshData,
    getCachedData,
    isInitialized,
  };

  return (
    <PublicContext.Provider value={value}>{children}</PublicContext.Provider>
  );
};
