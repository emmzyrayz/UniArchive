// types/publicProfile.ts
// GET /api/users/[upid]: what anyone may see about a user. Never email,
// phone, date of birth, reg number, submission count, violations or
// account status.
import type { UserRole } from "@/types/roles";
import type { MaterialSummary } from "@/types/unilibrary";

export interface PublicProfile {
  upid: string;
  username?: string;
  fullName: string;
  profilePhoto?: string;
  bio?: string;
  role: UserRole;
  universityName?: string;
  universityAbbr?: string;
  facultyName?: string;
  departmentName?: string;
  level?: string;
  verifiedMaterialCount: number;
  /** ISO date, for "Member since" */
  createdAt: string;
  isCollaboratorOrAbove: boolean;
}

/** GET /api/users/[upid]/materials */
export interface PublicMaterialsResponse {
  materials: MaterialSummary[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
