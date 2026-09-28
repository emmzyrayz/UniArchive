// types/admin.ts
// Shapes returned by the /api/admin/* routes and used by the admin pages.
import type { UserRole } from "@/types/roles";

/** GET /api/admin/counts */
export interface AdminCounts {
  pendingSubmissions: number;
  inReviewSubmissions: number;
  pendingRoleApplications: number;
  pendingSchoolSuggestions: number;
  possibleDuplicates: number;
  totalMaterials: number;
  totalUsers: number;
  newUsersThisWeek: number;
  totalInstitutions: number;
  reportedComments: number;
}

// --- Reported comments ------------------------------------------------------

export interface AdminCommentDto {
  id: string;
  text: string;
  authorUpid: string;
  authorName: string;
  materialId: string;
  materialTitle: string;
  /** For "View material": opens the reader */
  bookId?: string;
  reportCount: number;
  isDeleted: boolean;
  isReported: boolean;
  createdAt: string;
  /** Replies only */
  parentId?: string;
  parentAuthorUpid?: string;
}

export interface AdminCommentsResponse extends Paginated {
  comments: AdminCommentDto[];
  reportedCount: number;
}

export interface Paginated {
  total: number;
  page: number;
  totalPages: number;
}

// --- Materials --------------------------------------------------------------

export interface AdminMaterialDto {
  id: string;
  bookId: string;
  title: string;
  category: string;
  subcategory?: string;
  tags: string[];
  universityId?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyName?: string;
  departmentName?: string;
  courseCode?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
  verificationTier: "tier1" | "tier2";
  tier1VerifiedAt: string;
  tier1VerifiedByUpid: string;
  submittedByUpid: string;
  viewCount: number;
  downloadCount: number;
  reportCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminMaterialsResponse extends Paginated {
  materials: AdminMaterialDto[];
  counts: { active: number; inactive: number };
}

// --- Users ------------------------------------------------------------------

export interface AdminUserDto {
  id: string;
  upid: string;
  fullName: string;
  username?: string;
  role: UserRole;
  /** Masked, e.g. "use***@gmail.com" */
  email: string;
  universityName?: string;
  departmentName?: string;
  verifiedMaterialCount: number;
  submissionCount: number;
  violationCount: number;
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: string;
  profileCompletion: number;
}

export interface AdminUsersResponse extends Paginated {
  users: AdminUserDto[];
}

// --- Institutions -----------------------------------------------------------

export interface AdminUniversityDto {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  ownership: "Federal" | "State" | "Private";
  state: string;
  city?: string;
  website?: string;
  logoUrl?: string;
  foundingYear?: number;
  affiliationType?: string;
  isActive: boolean;
  verificationStatus: "unverified" | "verified" | "flagged";
  totalFaculties: number;
  totalDepartments: number;
}

export interface AdminUniversitiesResponse extends Paginated {
  universities: AdminUniversityDto[];
}

export interface AdminFacultyDto {
  id: string;
  universityId: string;
  name: string;
  abbreviation?: string;
  isActive: boolean;
  totalDepartments: number;
}

export interface AdminDepartmentDto {
  id: string;
  universityId: string;
  facultyId: string;
  name: string;
  abbreviation?: string;
  isActive: boolean;
}

// --- School suggestions -----------------------------------------------------

export interface AdminSuggestionDto {
  id: string;
  status: string;
  scope: "full" | "faculty_department" | "department_only";
  suggestedUniversityName: string;
  suggestedUniversityAbbr?: string;
  suggestedUniversityState?: string;
  suggestedUniversityOwnership?: "Federal" | "State" | "Private";
  suggestedFacultyName: string;
  suggestedDepartmentName: string;
  submittedByUpid: string;
  submittedAt: string;
  adminPriority: number;
  /** Other students' suggestions linked to this one */
  linkedCount: number;
  /** Users whose profile will be updated by a decision */
  affectedUsers: number;
  existingUniversity?: { id: string; name: string; abbreviation: string };
  existingFaculty?: { id: string; name: string };
  /** For possible_duplicate: the existing university it resembles */
  similarUniversity?: { id: string; name: string; abbreviation: string; score: number };
  linkedToSuggestionId?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

/** GET /api/admin/institutions/[id]/preview */
export interface UniversityPreview {
  id: string;
  name: string;
  abbreviation: string;
  state: string;
  city?: string;
  ownership: string;
  type: string;
  isActive: boolean;
  totalFaculties: number;
  totalDepartments: number;
  verificationStatus: string;
  /** The first few, alphabetically */
  faculties: { id: string; name: string; totalDepartments: number }[];
}

export interface AdminSuggestionsResponse extends Paginated {
  suggestions: AdminSuggestionDto[];
  counts: Record<string, number>;
}
