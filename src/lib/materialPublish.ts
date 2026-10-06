// src/lib/materialPublish.ts
// The life of a UniLibrary Material, one per PDF (keyed by bookId):
//  - upsertUnverifiedFromSubmission / upsertUnverifiedFromPlatformBook: a
//    student submits a PDF, or staff upload (or a student gifts) one, and it
//    is listed at once as "unverified" with whatever details are known
//    (none for a bulk upload: an "Unidentified PDF").
//  - verifyMaterialRecord: tier-1 verification of a community submission
//    (/api/admin/submissions/[id]/verify) or publishing a platform file
//    (/api/mod/uploads/[id]/publish) turns it "verified" with the reviewed
//    details, so both produce identical records. Contributor credit
//    (counts, badges, emails) is the caller's business: platform materials
//    get none.
//  - removeUnverifiedMaterial: a rejected submission or a discarded upload
//    leaves the library.
// Listing an unverified PDF is best effort: if it fails, the PDF simply
// waits for review as before (the backfill script catches up).
import type { Types } from "mongoose";
import type { SessionUser } from "@/lib/auth/session";
import type { IBook, IBookPlatform } from "@/lib/models/bookModel";
import type { MaterialOutline } from "@/lib/outline";
import { SUBMISSION_LEVELS, type IMaterialSubmission } from "@/lib/models/materialSubmissionModel";
import { getMaterialModel, type IMaterial, type MaterialSource } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getMaterialReportModel } from "@/lib/models/materialReportModel";

export type PublishableBook = Pick<
  IBook,
  "storageProvider" | "storageKey" | "cloudinaryPublicId" | "fileSize" | "pageCount"
>;

// Details a Material copies; absent optional ones are cleared on update
const OPTIONAL_DETAILS = [
  "subcategory", "universityId", "universityName", "universityAbbr", "facultyId", "facultyName",
  "departmentId", "departmentName", "courseCode", "courseName", "level", "semester", "academicYear",
] as const;

function storageFields(book: PublishableBook) {
  const isCloudinary = book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;
  return {
    storageProvider: isCloudinary ? "cloudinary" : "backblaze",
    storageKey: isCloudinary ? book.cloudinaryPublicId! : book.storageKey,
    fileSize: book.fileSize,
    ...(book.pageCount ? { pageCount: book.pageCount } : {}),
  };
}

function submissionDetails(s: IMaterialSubmission) {
  return {
    title: s.title,
    description: s.description,
    category: s.category,
    subcategory: s.subcategory,
    tags: s.tags ?? [],
    language: s.language,
    universityId: s.universityId,
    universityName: s.universityName,
    universityAbbr: s.universityAbbr,
    facultyId: s.facultyId,
    facultyName: s.facultyName,
    departmentId: s.departmentId,
    departmentName: s.departmentName,
    courseCode: s.courseCode,
    courseName: s.courseName,
    level: s.level,
    semester: s.semester,
    academicYear: s.academicYear,
  };
}

/** $set the defined values, $unset the optional details that are absent. */
function setAndUnset(fields: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) $set[key] = value;
    else if ((OPTIONAL_DETAILS as readonly string[]).includes(key)) $unset[key] = "";
  }
  return { $set, ...(Object.keys($unset).length ? { $unset } : {}) };
}

// --- Verified ------------------------------------------------------------------

/**
 * Makes the PDF's Material verified with the reviewed details (creating it
 * when the PDF was never listed, e.g. it predates unverified listing).
 * `verifier` becomes its tier-1 verifier.
 */
export async function verifyMaterialRecord(
  submission: IMaterialSubmission,
  book: PublishableBook,
  verifier: Pick<SessionUser, "userId" | "upid">,
  options: { source: MaterialSource; note?: string; verifiedAt: Date; outline?: MaterialOutline },
): Promise<IMaterial> {
  const Material = await getMaterialModel();
  const update = setAndUnset({
    submissionId: submission._id,
    submittedBy: submission.submittedBy,
    submittedByUpid: submission.submittedByUpid,
    source: options.source,
    ...submissionDetails(submission),
    ...storageFields(book),
    status: "verified",
    isActive: true,
    verificationTier: "tier1",
    tier1VerifiedBy: verifier.userId,
    tier1VerifiedByUpid: verifier.upid,
    tier1VerifiedAt: options.verifiedAt,
    ...(options.note ? { tier1Note: options.note } : {}),
    ...(options.outline ? { outline: options.outline } : {}),
  });
  const material = await Material.findOneAndUpdate({ bookId: submission.bookId }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  }).lean<IMaterial>();
  return material!;
}

// --- Unverified ----------------------------------------------------------------

/** Creates or refreshes the unverified Material for a PDF; never touches a verified one. */
async function upsertUnverified(bookId: Types.ObjectId, fields: Record<string, unknown>): Promise<void> {
  const Material = await getMaterialModel();
  const update = setAndUnset({ ...fields, isActive: true });
  const updated = await Material.updateOne({ bookId, status: "unverified" }, update);
  if (updated.matchedCount > 0) return;
  if (await Material.exists({ bookId })) return; // already verified
  try {
    await Material.create({ ...update.$set, bookId, status: "unverified" });
  } catch (error) {
    // Created by a concurrent request: nothing to do
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

/** A student submitted `submission` for review: list it, unverified, with their details. */
export async function upsertUnverifiedFromSubmission(
  submission: IMaterialSubmission,
  book: PublishableBook,
): Promise<void> {
  await upsertUnverified(submission.bookId, {
    submissionId: submission._id,
    submittedBy: submission.submittedBy,
    submittedByUpid: submission.submittedByUpid,
    source: "community",
    ...submissionDetails(submission),
    ...storageFields(book),
  }).catch((error) => console.error("Listing an unverified submission failed:", error));
}

type PlatformBook = PublishableBook & Pick<IBook, "title" | "description"> & {
  _id: Types.ObjectId;
  platform: Pick<IBookPlatform, "source" | "uploadedBy" | "uploadedByUpid" | "gift">;
};

/** "300L" (profile style) -> "300" when it's a level submissions use. */
function submissionLevel(level?: string): string | undefined {
  const value = level && /^\d00L$/i.test(level) ? level.slice(0, -1) : level;
  return value && (SUBMISSION_LEVELS as readonly string[]).includes(value) ? value : undefined;
}

/**
 * Staff uploaded (or a student gifted) `book`: list it, unverified. A bulk
 * upload has only its file name ("Unidentified PDF"); a gift carries the
 * student's note and school.
 */
export async function upsertUnverifiedFromPlatformBook(book: PlatformBook): Promise<void> {
  const gift = book.platform.source === "gift" ? book.platform.gift : undefined;
  await upsertUnverified(book._id, {
    submittedBy: book.platform.uploadedBy,
    submittedByUpid: book.platform.uploadedByUpid,
    source: "platform",
    title: book.title.slice(0, 200),
    description: gift?.note ?? "",
    ...(gift
      ? {
          universityId: gift.universityId,
          universityName: gift.universityName,
          universityAbbr: gift.universityAbbr,
          facultyId: gift.facultyId,
          facultyName: gift.facultyName,
          departmentId: gift.departmentId,
          departmentName: gift.departmentName,
          level: submissionLevel(gift.level),
        }
      : {}),
    ...storageFields(book),
  }).catch((error) => console.error("Listing an unverified platform file failed:", error));
}

/**
 * The PDF won't be verified (rejected submission, discarded upload): its
 * unverified Material leaves the library. It's deleted, unless people
 * already commented, reacted or typed it out: then it's only hidden, so
 * their work isn't lost if it comes back.
 */
export async function removeUnverifiedMaterial(bookId: Types.ObjectId): Promise<"deleted" | "hidden" | "none"> {
  const Material = await getMaterialModel();
  const material = await Material.findOne({ bookId, status: "unverified" })
    .select("_id commentCount reactionCount hasTypedContent")
    .lean();
  if (!material) return "none";
  if (material.commentCount || material.reactionCount || material.hasTypedContent) {
    await Material.updateOne({ _id: material._id }, { $set: { isActive: false } });
    return "hidden";
  }
  await Material.deleteOne({ _id: material._id, status: "unverified" });
  // Readers' suggestions and reports about it go with it
  await Promise.all([
    getMaterialSuggestionModel().then((S) => S.deleteMany({ materialId: material._id })),
    getMaterialReportModel().then((R) => R.deleteMany({ materialId: material._id })),
  ]);
  return "deleted";
}
