// src/lib/publicMaterials.ts
// The public shape of a UniLibrary Material (MaterialSummary), shared by
// GET /api/materials and GET /api/users/[upid]/materials.
import type { IMaterial } from "@/lib/models/materialModel";
import type { MaterialSummary } from "@/types/unilibrary";

// Storage fields stay server-side: the file is only reachable through the
// signed URL the reader gets from /api/books/[id].
export const PUBLIC_MATERIAL_FIELDS = [
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
].join(" ");

export type PublicMaterialDoc = Pick<
  IMaterial,
  | "_id"
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
  };
}
