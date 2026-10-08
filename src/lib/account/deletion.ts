// src/lib/account/deletion.ts
// Account deletion, as agreed for v1:
//   1. requestDeletionCode: the signed-in user asks; we email a code (proves
//      they own the email, not just a signed-in browser).
//   2. confirmDeletion: the code schedules the erase for 7 days later and
//      signs them out everywhere. Meanwhile the account is hidden: no public
//      profile, no broadcasts.
//   3. cancelPendingDeletion: any sign-in in those 7 days cancels it
//      (called from startSession, so password and Google alike).
//   4. purgeAccount (daily cron, /api/cron/purge-accounts): erases it.
//
// What the purge keeps: what other students use. Books behind a UniLibrary
// material, the materials, typed questions/answers/notes, comments and
// reactions stay, with the person's upid, name and photo removed (shown as
// "a former member"). Everything else of theirs is deleted, including their
// private files, avatar and Brevo contact, and finally the account itself.
// Steps are idempotent and the user record goes last, so a purge that fails
// halfway is simply finished by the next run.
//
// Keep in step with lib/account/dataExport.ts when adding collections.
import { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { LIBRARY_BOOKS, getBookModel } from "@/lib/models/bookModel";
import { getAnnotationModel } from "@/lib/models/annotationModel";
import { getReadingProgressModel } from "@/lib/models/readingProgressModel";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { removeUnverifiedMaterial } from "@/lib/materialPublish";
import { getCommentModel } from "@/lib/models/commentModel";
import { getReactionModel } from "@/lib/models/reactionModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getTypedAnswerModel } from "@/lib/models/typedAnswerModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import { getConversionDraftModel } from "@/lib/models/conversionDraftModel";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { getSchoolSuggestionModel } from "@/lib/models/schoolSuggestionModel";
import { getContributionEventModel } from "@/lib/models/contributionEventModel";
import { getUserBadgeModel } from "@/lib/models/userBadgeModel";
import { getLoginEventModel } from "@/lib/models/loginEventModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { getTrustedDeviceModel } from "@/lib/models/trustedDeviceModel";
import { getSurveyResponseModel } from "@/lib/models/surveyResponseModel";
import { getMaterialReportModel } from "@/lib/models/materialReportModel";
import { getDriveImportModel } from "@/lib/models/driveImportModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getNotificationModel } from "@/lib/models/notificationModel";
import { anonymiseLedger } from "@/lib/economy/wallet";
import { getPendingLinkModel } from "@/lib/models/pendingLinkModel";
import { getSentMailModel } from "@/lib/models/sentMailModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { storageClient } from "@/lib/storage";
import { pageImagePrefix } from "@/lib/pdfJobs";
import { deleteCloudinaryPdf, deleteUserAvatar, isOwnAvatarUrl } from "@/lib/cloudinary";
import { brevoConfigured, deleteBrevoContact } from "@/lib/brevo";
import { cacheTokenVersion } from "@/lib/auth/tokenVersionCache";
import { revokeTrustedDevices } from "@/lib/auth/deviceRecognition";
import { MAX_CODE_ATTEMPTS, generateOtp, hashOtp, maskEmailAddress, safeEqualHex } from "@/lib/auth/tokens";
import { isStaffRole, type UserRole } from "@/types/roles";
import {
  sendAccountDeletionCancelled,
  sendAccountDeletionCode,
  sendAccountDeletionScheduled,
} from "@/utils/email";

export const DELETION_GRACE_DAYS = 7;
const CODE_TTL_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeletionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const firstName = (u: { firstName?: string; fullName: string }) => u.firstName || u.fullName.split(/\s+/)[0] || "there";

/** Emails a confirmation code. Returns where it went (masked). */
export async function requestDeletionCode(userId: string): Promise<string> {
  const User = await getUserModel();
  const user = await User.findById(userId)
    .select("email firstName fullName role deletion")
    .lean<{ email: string; firstName?: string; fullName: string; role: UserRole; deletion?: object }>();
  if (!user) throw new DeletionError("Account not found.", 404);
  if (isStaffRole(user.role)) {
    throw new DeletionError("Staff accounts can't be deleted. Ask another admin to remove your staff role first.", 409);
  }
  if (user.deletion) throw new DeletionError("This account is already scheduled for deletion.", 409);

  const email = decryptSensitiveData(user.email);
  const otp = generateOtp();
  await User.updateOne(
    { _id: userId },
    { $set: { deletionCodeHash: hashOtp(otp), deletionCodeExpires: new Date(Date.now() + CODE_TTL_MS), deletionCodeAttempts: 0 } },
  );
  const sent = await sendAccountDeletionCode({ toEmail: email, toName: firstName(user), otp });
  if (!sent && process.env.NODE_ENV === "production") {
    throw new DeletionError("We couldn't send the code. Please try again.", 502);
  }
  return maskEmailAddress(email);
}

/** Checks the code, schedules the erase and signs the user out everywhere. */
export async function confirmDeletion(userId: string, code: string): Promise<Date> {
  const User = await getUserModel();
  const user = await User.findById(userId)
    .select("email firstName fullName role deletion deletionCodeHash deletionCodeExpires deletionCodeAttempts")
    .lean<{
      email: string;
      firstName?: string;
      fullName: string;
      role: UserRole;
      deletion?: object;
      deletionCodeHash?: string;
      deletionCodeExpires?: Date;
      deletionCodeAttempts?: number;
    }>();
  if (!user) throw new DeletionError("Account not found.", 404);
  if (isStaffRole(user.role)) throw new DeletionError("Staff accounts can't be deleted.", 409);
  if (user.deletion) throw new DeletionError("This account is already scheduled for deletion.", 409);
  if (!user.deletionCodeHash) throw new DeletionError("Ask for a code first.", 400);
  if ((user.deletionCodeAttempts ?? 0) >= MAX_CODE_ATTEMPTS) {
    throw new DeletionError("Too many attempts. Ask for a new code.", 429);
  }
  const expired = !user.deletionCodeExpires || user.deletionCodeExpires.getTime() < Date.now();
  if (expired || !/^\d{6}$/.test(code) || !safeEqualHex(user.deletionCodeHash, hashOtp(code))) {
    await User.updateOne({ _id: userId }, { $inc: { deletionCodeAttempts: 1 } });
    throw new DeletionError("Invalid or expired code.", 400);
  }

  const now = new Date();
  const purgeAfter = new Date(now.getTime() + DELETION_GRACE_DAYS * DAY_MS);
  // Bumping tokenVersion rejects every outstanding session JWT too
  const updated = await User.findOneAndUpdate(
    { _id: userId, deletion: { $exists: false } },
    {
      $set: { deletion: { requestedAt: now, purgeAfter } },
      $unset: { deletionCodeHash: 1, deletionCodeExpires: 1, deletionCodeAttempts: 1 },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: "after", projection: { tokenVersion: 1 } },
  ).lean<{ tokenVersion?: number }>();
  if (!updated) throw new DeletionError("This account is already scheduled for deletion.", 409);

  await cacheTokenVersion(userId, updated.tokenVersion ?? 0);
  await (await getSessionCacheModel()).invalidateAllUserSessions(userId);
  await revokeTrustedDevices(userId);
  console.info(`[account-deletion] ${userId} scheduled for ${purgeAfter.toISOString()}`);

  await sendAccountDeletionScheduled({ toEmail: decryptSensitiveData(user.email), toName: firstName(user), purgeAfter }).catch(
    (error) => console.error("[account-deletion] scheduled email failed:", error),
  );
  return purgeAfter;
}

/** A sign-in during the grace period cancels the deletion (startSession). */
export async function cancelPendingDeletion(userId: string): Promise<boolean> {
  const User = await getUserModel();
  const user = await User.findOneAndUpdate(
    { _id: userId, deletion: { $exists: true } },
    { $unset: { deletion: 1 } },
    { projection: { email: 1, firstName: 1, fullName: 1 } },
  ).lean<{ email: string; firstName?: string; fullName: string }>();
  if (!user) return false;
  console.info(`[account-deletion] ${userId} cancelled by signing in`);
  await sendAccountDeletionCancelled({ toEmail: decryptSensitiveData(user.email), toName: firstName(user) }).catch((error) =>
    console.error("[account-deletion] cancelled email failed:", error),
  );
  return true;
}

// --- The purge ----------------------------------------------------------------

interface PurgeSummary {
  booksDeleted: number;
  booksKept: number;
  anonymised: Record<string, number>;
  deleted: Record<string, number>;
}

async function removeBookFile(book: {
  _id: Types.ObjectId;
  storageProvider?: string;
  cloudinaryPublicId?: string;
  storageKey: string;
  pageImages?: unknown;
}): Promise<void> {
  const removed =
    book.storageProvider === "cloudinary" && book.cloudinaryPublicId
      ? await deleteCloudinaryPdf(book.cloudinaryPublicId)
      : await storageClient.deleteFile(book.storageKey);
  if (!removed.success) throw new Error(`storage delete failed for book ${book._id}: ${removed.error}`);
  if (book.pageImages) {
    await storageClient.deleteFilesByPrefix(pageImagePrefix(String(book._id))).catch((error) =>
      console.error(`[account-deletion] page images of ${book._id}:`, error),
    );
  }
}

/** Erases one account whose grace period has ended. */
export async function purgeAccount(userId: Types.ObjectId): Promise<PurgeSummary> {
  const User = await getUserModel();
  const user = await User.findById(userId)
    .select("email profilePhoto deletion")
    .lean<{ email: string; profilePhoto?: string; deletion?: { purgeAfter: Date } }>();
  if (!user?.deletion) throw new Error(`${userId} isn't scheduled for deletion`);
  const id = userId;
  const uid = String(userId);
  const summary: PurgeSummary = { booksDeleted: 0, booksKept: 0, anonymised: {}, deleted: {} };

  // 1. Library books: keep the ones a UniLibrary material uses, delete the rest
  const [Book, Material, Submission, Annotation, Progress] = await Promise.all([
    getBookModel(), getMaterialModel(), getMaterialSubmissionModel(), getAnnotationModel(), getReadingProgressModel(),
  ]);
  const books = await Book.find({ uploaderId: id, ...LIBRARY_BOOKS })
    .select("storageProvider cloudinaryPublicId storageKey pageImages")
    .lean<{ _id: Types.ObjectId; storageProvider?: string; cloudinaryPublicId?: string; storageKey: string; pageImages?: unknown }[]>();
  for (const book of books) {
    // A PDF still waiting for review leaves the library with its owner
    await removeUnverifiedMaterial(book._id);
    if (await Material.exists({ bookId: book._id })) {
      await Book.updateOne({ _id: book._id }, { $set: { ownerUpid: "" } });
      summary.booksKept++;
      continue;
    }
    await removeBookFile(book);
    await Book.deleteOne({ _id: book._id });
    await Annotation.deleteMany({ bookId: book._id });
    await Progress.deleteMany({ bookId: book._id });
    await Submission.deleteMany({ bookId: book._id, status: { $ne: "verified" } });
    summary.booksDeleted++;
  }

  // 2. Anonymise what other students use
  const anonymise = async (label: string, run: () => Promise<{ modifiedCount: number }>) => {
    summary.anonymised[label] = (await run()).modifiedCount;
  };
  const [Comment, Reaction, TypedQuestion, TypedAnswer, ContentDocument] = await Promise.all([
    getCommentModel(), getReactionModel(), getTypedQuestionModel(), getTypedAnswerModel(), getContentDocumentModel(),
  ]);
  await anonymise("materials", () => Material.updateMany({ submittedBy: id }, { $set: { submittedByUpid: "" } }));
  // (authorId/authorUpid on a submission belong to its staff review notes)
  await anonymise("submissions", () => Submission.updateMany({ submittedBy: id }, { $set: { submittedByUpid: "" } }));
  await anonymise("typedQuestions", () => TypedQuestion.updateMany({ submittedBy: id }, { $set: { submittedByUpid: "" } }));
  await anonymise("typedAnswers", () => TypedAnswer.updateMany({ submittedBy: id }, { $set: { submittedByUpid: "" } }));
  await anonymise("typedNotes", () => ContentDocument.updateMany({ createdBy: id }, { $set: { createdByUpid: "" } }));
  await anonymise("comments", () =>
    Comment.updateMany(
      { authorId: id },
      { $set: { authorUpid: "", authorName: "Former member" }, $unset: { authorProfilePhoto: 1 } },
    ),
  );
  await anonymise("reactions", () => Reaction.updateMany({ userId: id }, { $set: { userUpid: "" } }));
  // Survey answers stay in the results; who gave them doesn't
  const SurveyResponse = await getSurveyResponseModel();
  await anonymise("surveyResponses", () =>
    SurveyResponse.updateMany(
      { userId: id },
      { $unset: { userId: 1, "respondent.name": 1, "respondent.email": 1, "respondent.emailHash": 1, ipHash: 1 } },
    ),
  );

  // 3. Delete everything else of theirs
  const remove = async (label: string, run: () => Promise<{ deletedCount: number }>) => {
    summary.deleted[label] = (await run()).deletedCount;
  };
  const [Draft, RoleApplication, SchoolSuggestion, Contribution, UserBadge, LoginEvent, SessionCache, TrustedDevice, PendingLink, SentMail] =
    await Promise.all([
      getConversionDraftModel(), getRoleApplicationModel(), getSchoolSuggestionModel(), getContributionEventModel(),
      getUserBadgeModel(), getLoginEventModel(), getSessionCacheModel(), getTrustedDeviceModel(), getPendingLinkModel(),
      getSentMailModel(),
    ]);
  await remove("highlightsAndBookmarks", () => Annotation.deleteMany({ userId: id }));
  await remove("readingProgress", () => Progress.deleteMany({ userId: id }));
  await remove("conversionDrafts", () => Draft.deleteMany({ userId: id }));
  await remove("roleApplications", () => RoleApplication.deleteMany({ applicantId: id }));
  await remove("schoolSuggestions", () => SchoolSuggestion.deleteMany({ submittedBy: id }));
  await remove("contributionHistory", () => Contribution.deleteMany({ userId: id }));
  await remove("badges", () => UserBadge.deleteMany({ userId: id }));
  await remove("signInHistory", () => LoginEvent.deleteMany({ userId: id }));
  await remove("sessions", () => SessionCache.deleteMany({ userId: uid }));
  await remove("trustedDevices", () => TrustedDevice.deleteMany({ userId: id }));
  await remove("pendingLinks", () => PendingLink.deleteMany({ userId: id }));
  await remove("staffMessages", () => SentMail.deleteMany({ toUserId: id }));
  await remove("materialReports", async () => (await getMaterialReportModel()).deleteMany({ userId: id }));
  await remove("driveImports", async () => (await getDriveImportModel()).deleteMany({ importedBy: id }));
  // Credits: kept in the ledger as "a former member" so every total still adds up
  await anonymise("credits", async () => ({ modifiedCount: await anonymiseLedger(id) }));
  await remove("notifications", async () => (await getNotificationModel()).deleteMany({ userId: id }));
  await remove("helpIdentifySuggestions", async () => (await getMaterialSuggestionModel()).deleteMany({ userId: id }));

  // 4. Outside services
  if (user.profilePhoto && isOwnAvatarUrl(user.profilePhoto, uid)) {
    const avatar = await deleteUserAvatar(uid);
    if (!avatar.success) throw new Error(`avatar delete failed: ${avatar.error}`);
  }
  if (brevoConfigured()) await deleteBrevoContact(decryptSensitiveData(user.email));

  // 5. The account itself, last
  await User.deleteOne({ _id: id, deletion: { $exists: true } });
  return summary;
}

/** The daily run: every account past its grace period, up to `limit`. */
export async function purgeDueAccounts(limit = 25): Promise<{ purged: string[]; failed: { id: string; error: string }[] }> {
  const User = await getUserModel();
  const due = await User.find({ "deletion.purgeAfter": { $lte: new Date() } })
    .select("_id")
    .limit(limit)
    .lean<{ _id: Types.ObjectId }[]>();
  const purged: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const { _id } of due) {
    try {
      const summary = await purgeAccount(_id);
      purged.push(String(_id));
      console.info(`[account-deletion] purged ${_id}`, JSON.stringify(summary));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ id: String(_id), error: message });
      console.error(`[account-deletion] purge of ${_id} failed (retried next run):`, error);
    }
  }
  return { purged, failed };
}
