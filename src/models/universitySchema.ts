// /lib/universitySchema.ts

export type Ownership = "public" | "private";

export interface DepartmentInput {
  id: string;
  name: string;
}

export interface FacultyInput {
  id: string;
  name: string;
  departments: DepartmentInput[];
}

export interface CampusInput {
  id: string;
  name: string;
  location: string;
  type: 'main' | 'branch' | 'satellite';
}

export interface UniversityInput {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  faculties: FacultyInput[];
  campuses: CampusInput[];
  // New fields
  membership: Ownership;
  level?: "federal" | "state";
  usid: string; // Unique School ID
  psid: string; // Platform School ID (human-readable)
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
}

// Utility functions for validation
export const validateOwnership = (ownership: string): ownership is Ownership => {
  return ownership === 'public' || ownership === 'private';
};

export const validateLevel = (level: string): level is "federal" | "state" => {
  return level === 'federal' || level === 'state';
};

export const validateCampusType = (type: string): type is 'main' | 'branch' | 'satellite' => {
  return type === 'main' || type === 'branch' || type === 'satellite';
};

// Type guards
export const isValidUniversityInput = (data: unknown): data is UniversityInput => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).id === 'string' &&
    typeof (data as Record<string, unknown>).name === 'string' &&
    typeof (data as Record<string, unknown>).description === 'string' &&
    typeof (data as Record<string, unknown>).location === 'string' &&
    typeof (data as Record<string, unknown>).website === 'string' &&
    typeof (data as Record<string, unknown>).logoUrl === 'string' &&
    validateOwnership((data as Record<string, unknown>).membership as string) &&
    typeof (data as Record<string, unknown>).usid === 'string' &&
    typeof (data as Record<string, unknown>).psid === 'string' &&
    Array.isArray((data as Record<string, unknown>).faculties) &&
    Array.isArray((data as Record<string, unknown>).campuses) &&
    ((data as Record<string, unknown>).foundingYear === undefined || 
     typeof (data as Record<string, unknown>).foundingYear === 'number') &&
    ((data as Record<string, unknown>).level === undefined || 
     validateLevel((data as Record<string, unknown>).level as string)) &&
    ((data as Record<string, unknown>).motto === undefined || 
     typeof (data as Record<string, unknown>).motto === 'string') &&
    ((data as Record<string, unknown>).chancellor === undefined || 
     typeof (data as Record<string, unknown>).chancellor === 'string') &&
    ((data as Record<string, unknown>).viceChancellor === undefined || 
     typeof (data as Record<string, unknown>).viceChancellor === 'string')
  );
};

// Filter and sort options
export interface SchoolFilterOptions {
  membership?: Ownership;
  level?: "federal" | "state";
  status?: 'active' | 'inactive' | 'pending';
  location?: string;
  search?: string;
  foundingYearRange?: {
    min?: number;
    max?: number;
  };
}

export interface SchoolSortOptions {
  field: 'name' | 'location' | 'foundingYear' | 'createdAt' | 'membership' | 'level';
  order: 'asc' | 'desc';
}