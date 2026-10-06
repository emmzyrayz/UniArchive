// src/lib/account/dataExport.ts
// "Download my data" (Settings > Privacy): everything UniArchive holds about
// one user, as JSON. Their own records in every collection, with encrypted
// fields decrypted and nothing secret: every key that is a hash, token,
// password or internal counter is dropped, and sessions, trusted devices and
// sign-in history use explicit allowlists. Files themselves aren't included
// (they're downloadable from the library); their details are.
//
// Keep this in step with the models: a new collection that stores a user's
// data needs a section here and a step in lib/account/deletion.ts.
import { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { LIBRARY_BOOKS, getBookModel } from "@/lib/models/bookModel";
import { getAnnotationModel } from "@/lib/models/annotationModel";
import { getReadingProgressModel } from "@/lib/models/readingProgressModel";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { getMaterialModel } from "@/lib/models/materialModel";
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
import { getSentMailModel } from "@/lib/models/sentMailModel";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { getSurveyResponseModel, type ISurveyResponse } from "@/lib/models/surveyResponseModel";
import { answerText } from "@/lib/survey/questions";
import { getMaterialReportModel } from "@/lib/models/materialReportModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { BADGE_DEFINITIONS, type BadgeId } from "@/lib/constants/badges";
import { effectiveEmailPrefs } from "@/lib/emailPrefs";

// Keys never exported, at any depth
// (Hash/token/password fields, one-time codes; not e.g. courseCode)
const SECRET_KEY = /hash$|token|password|secret|^otp|^verificationCode|^resetCode|^resetSession/i;
const INTERNAL_KEYS = new Set(["__v", "tokenVersion", "submissionKey", "requestKey"]);

/** Drops secret and internal keys; ObjectIds and Dates become strings. */
function scrub(value: unknown): unknown {
  if (value instanceof Types.ObjectId) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k) || INTERNAL_KEYS.has(k)) continue;
      out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

function decrypt(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return decryptSensitiveData(value);
  } catch {
    return undefined;
  }
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : undefined);

/** Survey answers given while signed in, as readable text. */
async function exportSurveyResponses(userId: Types.ObjectId) {
  const Response = await getSurveyResponseModel();
  const responses = await Response.find({ userId }).sort({ createdAt: 1 }).lean<ISurveyResponse[]>();
  if (responses.length === 0) return [];
  const Survey = await getSurveyModel();
  const surveys = await Survey.find({ _id: { $in: responses.map((r) => r.surveyId) } })
    .select("title questions")
    .lean<Pick<ISurvey, "_id" | "title" | "questions">[]>();
  const byId = new Map(surveys.map((s) => [String(s._id), s]));
  return responses.map((r) => {
    const survey = byId.get(String(r.surveyId));
    const about: Record<string, unknown> = { ...r.respondent };
    delete about.email;
    delete about.emailHash;
    return {
      survey: survey?.title ?? "(deleted survey)",
      answeredAt: iso(r.createdAt),
      lastChangedAt: iso(r.updatedAt),
      aboutYou: { ...(scrub(about) as object), email: decrypt(r.respondent?.email) },
      answers: (survey?.questions ?? []).map((q) => ({ question: q.label, answer: answerText(q, r.answers?.[q.id]) || null })),
    };
  });
}

export async function buildDataExport(userId: string): Promise<Record<string, unknown> | null> {
  const id = new Types.ObjectId(userId);
  const User = await getUserModel();
  const user = await User.findById(id).lean<Record<string, unknown> & { upid: string }>();
  if (!user) return null;

  const [
    Book, Annotation, Progress, Submission, Material, Comment, Reaction, TypedQuestion, TypedAnswer,
    ContentDocument, Draft, RoleApplication, SchoolSuggestion, Contribution, UserBadge, LoginEvent,
    SessionCache, TrustedDevice, SentMail,
  ] = await Promise.all([
    getBookModel(), getAnnotationModel(), getReadingProgressModel(), getMaterialSubmissionModel(),
    getMaterialModel(), getCommentModel(), getReactionModel(), getTypedQuestionModel(), getTypedAnswerModel(),
    getContentDocumentModel(), getConversionDraftModel(), getRoleApplicationModel(), getSchoolSuggestionModel(),
    getContributionEventModel(), getUserBadgeModel(), getLoginEventModel(), getSessionCacheModel(),
    getTrustedDeviceModel(), getSentMailModel(),
  ]);

  const [
    books, annotations, progress, submissions, materials, comments, reactions, questions, answers,
    documents, drafts, applications, suggestions, contributions, badges, signIns, sessions, devices, messages,
  ] = await Promise.all([
    Book.find({ uploaderId: id, ...LIBRARY_BOOKS }).lean(),
    Annotation.find({ userId: id }).lean(),
    Progress.find({ userId: id }).lean(),
    Submission.find({ submittedBy: id }).lean(),
    Material.find({ submittedBy: id }).select("title category subcategory courseCode universityName level semester academicYear verificationTier viewCount downloadCount reactionCount isActive createdAt").lean(),
    Comment.find({ authorId: id, isDeleted: { $ne: true } }).select("materialId parentId text upvoteCount editedAt createdAt").lean(),
    Reaction.find({ userId: id }).select("materialId reactionType createdAt").lean(),
    TypedQuestion.find({ submittedBy: id }).lean(),
    TypedAnswer.find({ submittedBy: id }).lean(),
    ContentDocument.find({ createdBy: id }).lean(),
    Draft.find({ userId: id }).lean(),
    RoleApplication.find({ applicantId: id }).lean(),
    SchoolSuggestion.find({ submittedBy: id }).lean(),
    Contribution.find({ userId: id }).lean(),
    UserBadge.find({ userId: id }).select("badgeId awardedAt").lean<{ badgeId: BadgeId; awardedAt: Date }[]>(),
    LoginEvent.find({ userId: id }).sort({ createdAt: -1 })
      .select("method viaEmailCode device deviceType ipAddress location createdAt").lean(),
    SessionCache.find({ userId: userId, isActive: true })
      .select("deviceInfo deviceType location ipAddress createdAt lastActivity expiresAt").lean(),
    TrustedDevice.find({ userId: id }).select("deviceName ipAddress createdAt lastUsedAt expiresAt").lean(),
    SentMail.find({ toUserId: id, status: "sent" }).select("subject body sentByName createdAt").lean(),
  ]);

  const surveyResponses = await exportSurveyResponses(id);
  const materialReports = await (await getMaterialReportModel()).find({ userId: id }).select("materialId reason note createdAt").lean();

  const account = {
    upid: user.upid,
    username: user.username,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: decrypt(user.email),
    phone: decrypt(user.phone),
    schoolEmail: decrypt(user.schoolEmail),
    schoolEmailVerifiedAt: iso(user.schoolEmailVerifiedAt),
    regNumber: decrypt(user.regNumber),
    dob: iso(user.dob),
    gender: user.gender,
    bio: user.bio,
    profilePhoto: user.profilePhoto,
    role: user.role,
    school: user.universityName ?? user.school,
    faculty: user.facultyName ?? user.faculty,
    department: user.departmentName ?? user.department,
    level: user.level,
    semester: user.semester,
    signsInWithGoogle: !!user.googleId,
    hasPassword: !!user.password,
    emailVerified: !!user.isVerified,
    emailPreferences: effectiveEmailPrefs(user.emailPrefs as Record<string, boolean> | undefined),
    verifiedMaterialCount: user.verifiedMaterialCount,
    joinedAt: iso(user.createdAt),
  };

  return {
    about: {
      service: "UniArchive (https://uniarchive.com.ng)",
      exportedAt: new Date().toISOString(),
      note:
        "Everything UniArchive stores about your account. Your uploaded files aren't included; download them from your library. Sign-in history covers the last 90 days.",
    },
    account,
    badges: badges.map((b) => ({ badge: BADGE_DEFINITIONS[b.badgeId]?.name ?? b.badgeId, awardedAt: iso(b.awardedAt) })),
    library: scrub(books),
    highlightsAndBookmarks: scrub(annotations),
    readingProgress: scrub(progress),
    submissionsToTheUniLibrary: scrub(submissions),
    publishedMaterials: scrub(materials),
    typedQuestions: scrub(questions),
    typedAnswers: scrub(answers),
    typedNotes: scrub(documents),
    conversionDrafts: scrub(drafts),
    comments: scrub(comments),
    reactions: scrub(reactions),
    roleApplications: scrub(applications),
    schoolSuggestions: scrub(suggestions),
    surveyResponses,
    materialReports: scrub(materialReports),
    contributionHistory: scrub(contributions),
    messagesFromTheUniArchiveTeam: scrub(messages),
    signInHistory: scrub(signIns),
    activeSessions: scrub(sessions),
    trustedDevices: scrub(devices),
  };
}
