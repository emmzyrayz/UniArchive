// src/types/unilibrary.ts
// Shapes returned by the public UniLibrary API (GET /api/materials).
import type {
  MaterialCategory,
  MaterialSubcategory,
} from "@/lib/constants/materialCategories";

export type MaterialSort = "recent" | "popular";

export interface MaterialSummary {
  _id: string;
  /** The submitter's Book that holds the file; the reader opens /read/[bookId]. */
  bookId: string;
  title: string;
  description: string;
  category: MaterialCategory;
  subcategory?: MaterialSubcategory;
  tags: string[];
  language?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyName?: string;
  departmentName?: string;
  courseCode?: string;
  courseName?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
  verificationTier: "tier1" | "tier2";
  hasTypedContent: boolean;
  viewCount: number;
  downloadCount: number;
  submittedByUpid: string;
  createdAt: string;
  pageCount?: number;
  fileSize: number;
}

export interface MaterialsResponse {
  materials: MaterialSummary[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  /** Per-category totals with every filter except category applied. */
  categoryCounts: Partial<Record<MaterialCategory, number>>;
}
