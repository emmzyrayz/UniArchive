// src/types/unilibrary.ts
// Shapes returned by the public UniLibrary API (GET /api/materials).
import type {
  MaterialCategory,
  MaterialSubcategory,
} from "@/lib/constants/materialCategories";
import type { ReactionCounts, ReactionType } from "@/lib/constants/reactions";

export type { ReactionCounts, ReactionType };

export type MaterialSort = "recent" | "popular" | "trending";

export interface MaterialSummary {
  _id: string;
  /** The submitter's Book that holds the file; the reader opens /read/[bookId]. */
  bookId: string;
  title: string;
  description: string;
  /** Absent on unidentified PDFs (staff uploads nobody has described yet) */
  category?: MaterialCategory;
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
  /** Absent while unverified */
  verificationTier?: "tier1" | "tier2";
  /** Details not checked by staff yet (shown with an Unverified badge) */
  unverified?: boolean;
  hasTypedContent: boolean;
  viewCount: number;
  downloadCount: number;
  /** Empty for platform materials, which are credited to UniArchive. */
  submittedByUpid: string;
  /** Uploaded by staff or gifted: shown as UniArchive, no uploader link. */
  isPlatform?: boolean;
  createdAt: string;
  pageCount?: number;
  fileSize: number;
  reactions: ReactionCounts;
  reactionCount: number;
  commentCount: number;
  /** Only on sort=trending */
  trendingScore?: number;
  /** The signed-in viewer's reaction, merged in on the client */
  userReaction?: ReactionType | null;
  /** The uploader's rarest badge, only when it's rare or legendary */
  uploaderTopBadge?: {
    badgeId: string;
    name: string;
    emoji: string;
    rarity: "rare" | "legendary" | "uncommon" | "common";
    description: string;
  };
}

export interface MaterialsResponse {
  materials: MaterialSummary[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  /** Per-category totals with every filter except category applied. */
  categoryCounts: Partial<Record<MaterialCategory, number>>;
  /** All matching materials, including unidentified PDFs (no category) */
  allCount?: number;
}

// --- Help identify (material suggestions) --------------------------------------

/** Details for a PDF, as a reader suggests them (ids as strings). */
export interface SuggestionFieldsDto {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  universityId?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  courseCode?: string;
  courseName?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
}

export interface SuggestionGroupDto {
  fingerprint: string;
  /** "Past Question · MTH101 · UNIZIK · 100" */
  summary: string;
  count: number;
  /** The newest suggestion's details in this group */
  fields: SuggestionFieldsDto;
  suggestions: { id: string; upid: string; createdAt: string; fields: SuggestionFieldsDto }[];
}

export interface MaterialSuggestionsResponse {
  /** Your own suggestion, if you made one */
  mine: (SuggestionFieldsDto & { status: "pending" | "accepted" | "declined"; updatedAt: string }) | null;
  /** What the form starts from: your suggestion, or the material's current details */
  prefill: SuggestionFieldsDto;
  /** Pending suggestions from everyone */
  count: number;
  /** Staff only: pending suggestions grouped by agreement, biggest first */
  groups?: SuggestionGroupDto[];
}
