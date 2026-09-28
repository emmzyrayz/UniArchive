// src/lib/publicMaterials.ts
// The public shape of a UniLibrary Material (MaterialSummary), shared by
// GET /api/materials and GET /api/users/[upid]/materials.
import type { IMaterial } from "@/lib/models/materialModel";
import type { MaterialSummary } from "@/types/unilibrary";
import { EMPTY_REACTIONS } from "@/lib/constants/reactions";
import type { BadgeDefinition } from "@/lib/constants/badges";
import { topBadgesFor } from "@/lib/badges";

// Storage fields stay server-side: the file is only reachable through the
// signed URL the reader gets from /api/books/[id]. submittedBy is queried
// to look up the uploader's badge but never sent (toMaterialSummary drops it).
export const PUBLIC_MATERIAL_FIELDS = [
  "submittedBy",
  "bookId",
  "title",
  "description",
  "category",
  "subcategory",
  "tags",
  "language",
  "universityName",
  "universityAbbr",
  "facultyName",
  "departmentName",
  "courseCode",
  "courseName",
  "level",
  "semester",
  "academicYear",
  "fileSize",
  "pageCount",
  "verificationTier",
  "hasTypedContent",
  "viewCount",
  "downloadCount",
  "submittedByUpid",
  "createdAt",
  "reactions",
  "reactionCount",
  "commentCount",
].join(" ");

export type PublicMaterialDoc = Pick<
  IMaterial,
  | "_id"
  | "submittedBy"
  | "bookId"
  | "title"
  | "description"
  | "category"
  | "subcategory"
  | "tags"
  | "language"
  | "universityName"
  | "universityAbbr"
  | "facultyName"
  | "departmentName"
  | "courseCode"
  | "courseName"
  | "level"
  | "semester"
  | "academicYear"
  | "fileSize"
  | "pageCount"
  | "verificationTier"
  | "hasTypedContent"
  | "viewCount"
  | "downloadCount"
  | "submittedByUpid"
  | "createdAt"
  | "reactions"
  | "reactionCount"
  | "commentCount"
>;

export function toMaterialSummary(doc: PublicMaterialDoc): MaterialSummary {
  return {
    _id: String(doc._id),
    bookId: String(doc.bookId),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    subcategory: doc.subcategory,
    tags: doc.tags ?? [],
    language: doc.language,
    universityName: doc.universityName,
    universityAbbr: doc.universityAbbr,
    facultyName: doc.facultyName,
    departmentName: doc.departmentName,
    courseCode: doc.courseCode,
    courseName: doc.courseName,
    level: doc.level,
    semester: doc.semester,
    academicYear: doc.academicYear,
    verificationTier: doc.verificationTier,
    hasTypedContent: !!doc.hasTypedContent,
    viewCount: doc.viewCount ?? 0,
    downloadCount: doc.downloadCount ?? 0,
    submittedByUpid: doc.submittedByUpid,
    createdAt: new Date(doc.createdAt).toISOString(),
    pageCount: doc.pageCount,
    fileSize: doc.fileSize,
    // Materials from before reactions existed have neither field
    reactions: { ...EMPTY_REACTIONS, ...doc.reactions },
    reactionCount: doc.reactionCount ?? 0,
    commentCount: doc.commentCount ?? 0,
  };
}

/**
 * toMaterialSummary for a list, plus each uploader's rarest (rare or
 * legendary) badge, looked up in one query.
 */
export async function toMaterialSummaries(docs: PublicMaterialDoc[]): Promise<MaterialSummary[]> {
  const badges = await topBadgesFor(docs.map((d) => d.submittedBy)).catch((error) => {
    // A badge lookup must never take the feed down
    console.error("uploader badge lookup failed:", error);
    return new Map<string, BadgeDefinition>();
  });
  return docs.map((doc) => {
    const badge = badges.get(String(doc.submittedBy));
    return {
      ...toMaterialSummary(doc),
      ...(badge
        ? {
            uploaderTopBadge: {
              badgeId: badge.id,
              name: badge.name,
              emoji: badge.emoji,
              rarity: badge.rarity,
              description: badge.description,
            },
          }
        : {}),
    };
  });
}
