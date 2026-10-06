// src/lib/adminMaterials.ts
// The admin view of a UniLibrary Material.
import type { IMaterial } from "@/lib/models/materialModel";
import type { AdminMaterialDto } from "@/types/admin";

export const ADMIN_MATERIAL_FIELDS =
  "bookId title category subcategory tags universityId universityName universityAbbr " +
  "facultyName departmentName courseCode level semester academicYear verificationTier " +
  "tier1VerifiedAt tier1VerifiedByUpid submittedByUpid viewCount downloadCount reportCount " +
  "isActive hiddenByReports status createdAt";

export type AdminMaterialDoc = Pick<
  IMaterial,
  | "_id"
  | "bookId"
  | "title"
  | "category"
  | "subcategory"
  | "tags"
  | "universityId"
  | "universityName"
  | "universityAbbr"
  | "facultyName"
  | "departmentName"
  | "courseCode"
  | "level"
  | "semester"
  | "academicYear"
  | "verificationTier"
  | "tier1VerifiedAt"
  | "tier1VerifiedByUpid"
  | "submittedByUpid"
  | "viewCount"
  | "downloadCount"
  | "reportCount"
  | "isActive"
  | "createdAt"
  | "status"
  | "hiddenByReports"
>;

export function toAdminMaterialDto(doc: AdminMaterialDoc): AdminMaterialDto {
  return {
    id: String(doc._id),
    bookId: String(doc.bookId),
    title: doc.title,
    category: doc.category,
    subcategory: doc.subcategory,
    tags: doc.tags ?? [],
    universityId: doc.universityId ? String(doc.universityId) : undefined,
    universityName: doc.universityName,
    universityAbbr: doc.universityAbbr,
    facultyName: doc.facultyName,
    departmentName: doc.departmentName,
    courseCode: doc.courseCode,
    level: doc.level,
    semester: doc.semester,
    academicYear: doc.academicYear,
    status: doc.status ?? "verified",
    verificationTier: doc.verificationTier,
    tier1VerifiedAt: doc.tier1VerifiedAt ? new Date(doc.tier1VerifiedAt).toISOString() : undefined,
    tier1VerifiedByUpid: doc.tier1VerifiedByUpid,
    submittedByUpid: doc.submittedByUpid,
    viewCount: doc.viewCount ?? 0,
    downloadCount: doc.downloadCount ?? 0,
    reportCount: doc.reportCount ?? 0,
    isActive: doc.isActive,
    ...(doc.hiddenByReports ? { hiddenByReports: true } : {}),
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}
