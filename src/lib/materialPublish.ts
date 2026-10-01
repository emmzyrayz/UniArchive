// src/lib/materialPublish.ts
// Creates the UniLibrary Material for a verified submission. Shared by tier-1
// verification of community submissions (/api/admin/submissions/[id]/verify)
// and publishing platform files (/api/mod/uploads/[id]/publish), so both
// produce identical records. Contributor credit (counts, badges, emails) is
// the caller's business: platform materials get none.
import type { HydratedDocument } from "mongoose";
import type { SessionUser } from "@/lib/auth/session";
import type { IBook } from "@/lib/models/bookModel";
import type { IMaterialSubmission } from "@/lib/models/materialSubmissionModel";
import {
  getMaterialModel,
  type IMaterial,
  type MaterialCategory,
  type MaterialSource,
  type MaterialSubcategory,
} from "@/lib/models/materialModel";

export type PublishableBook = Pick<
  IBook,
  "storageProvider" | "storageKey" | "cloudinaryPublicId" | "fileSize" | "pageCount"
>;

/** The Material for `submission`; `verifier` becomes its tier-1 verifier. */
export async function createMaterialRecord(
  submission: IMaterialSubmission,
  book: PublishableBook,
  verifier: Pick<SessionUser, "userId" | "upid">,
  options: { source: MaterialSource; note?: string; verifiedAt: Date },
): Promise<HydratedDocument<IMaterial>> {
  const Material = await getMaterialModel();
  const isCloudinary = book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;
  return Material.create({
    submissionId: submission._id,
    bookId: submission.bookId,
    submittedBy: submission.submittedBy,
    submittedByUpid: submission.submittedByUpid,
    source: options.source,

    title: submission.title,
    description: submission.description,
    category: submission.category as MaterialCategory,
    subcategory: submission.subcategory as MaterialSubcategory | undefined,
    tags: submission.tags,
    language: submission.language,

    universityId: submission.universityId,
    universityName: submission.universityName,
    universityAbbr: submission.universityAbbr,
    facultyId: submission.facultyId,
    facultyName: submission.facultyName,
    departmentId: submission.departmentId,
    departmentName: submission.departmentName,
    courseCode: submission.courseCode,
    courseName: submission.courseName,
    level: submission.level,
    semester: submission.semester,
    academicYear: submission.academicYear,

    storageProvider: isCloudinary ? "cloudinary" : "backblaze",
    storageKey: isCloudinary ? book.cloudinaryPublicId! : book.storageKey,
    fileSize: book.fileSize,
    pageCount: book.pageCount,

    verificationTier: "tier1",
    tier1VerifiedBy: verifier.userId,
    tier1VerifiedByUpid: verifier.upid,
    tier1VerifiedAt: options.verifiedAt,
    tier1Note: options.note,
  });
}
