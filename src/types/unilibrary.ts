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
}
