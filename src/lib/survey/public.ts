// src/lib/survey/public.ts
// What the public survey pages read: open surveys, one survey by slug, the
// visitor's own response (to change it) and a prefill from their profile.
import { Types } from "mongoose";
import type { SessionUser } from "@/lib/auth/session";
import { decryptSensitiveData } from "@/lib/encryption";
import { getUserModel } from "@/lib/models/userModel";
import { getSurveyModel, isAcceptingResponses, type ISurvey } from "@/lib/models/surveyModel";
import { getSurveyResponseModel, type ISurveyResponse } from "@/lib/models/surveyResponseModel";
import {
  RESPONDENT_ROLES,
  SURVEY_LEVELS,
  cleanRespondentConfig,
  type Answers,
  type RespondentConfig,
  type RespondentInput,
  type SurveyQuestion,
} from "./questions";

export interface PublicSurveyDto {
  slug: string;
  title: string;
  intro: string;
  thankYouMessage: string;
  respondentFields: RespondentConfig;
  questions: SurveyQuestion[];
  accepting: boolean;
  status: ISurvey["status"];
  opensAt?: string;
  closesAt?: string;
}

export interface OwnResponseDto {
  respondent: RespondentInput;
  answers: Answers;
  submittedAt: string;
  updatedAt: string;
}

export function toPublicSurvey(s: ISurvey, now = new Date()): PublicSurveyDto {
  return {
    slug: s.slug,
    title: s.title,
    intro: s.intro,
    thankYouMessage: s.thankYouMessage,
    respondentFields: cleanRespondentConfig(s.respondentFields),
    questions: s.questions,
    accepting: isAcceptingResponses(s, now),
    status: s.status,
    ...(s.opensAt && { opensAt: new Date(s.opensAt).toISOString() }),
    ...(s.closesAt && { closesAt: new Date(s.closesAt).toISOString() }),
  };
}

/** Surveys taking answers now, newest first. */
export async function listOpenSurveys(now = new Date()): Promise<ISurvey[]> {
  const Survey = await getSurveyModel();
  return Survey.find({
    status: "open",
    $and: [
      { $or: [{ opensAt: { $exists: false } }, { opensAt: null }, { opensAt: { $lte: now } }] },
      { $or: [{ closesAt: { $exists: false } }, { closesAt: null }, { closesAt: { $gt: now } }] },
    ],
  })
    .sort({ openedAt: -1, _id: -1 })
    .limit(50)
    .lean<ISurvey[]>();
}

/** A survey that has been opened at least once (drafts are admin-only). */
export async function loadPublicSurvey(slug: string): Promise<ISurvey | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const Survey = await getSurveyModel();
  return Survey.findOne({ slug, status: { $in: ["open", "closed"] } }).lean<ISurvey>();
}

/** The visitor's own response, by account or by anonymous key. */
export async function loadOwnResponse(
  surveyId: Types.ObjectId,
  session: SessionUser | null,
  keyHash: string | undefined,
): Promise<OwnResponseDto | null> {
  if (!session && !keyHash) return null;
  const Response = await getSurveyResponseModel();
  const r = await Response.findOne(
    session ? { surveyId, userId: new Types.ObjectId(session.userId) } : { surveyId, respondentKeyHash: keyHash },
  ).lean<ISurveyResponse>();
  if (!r) return null;
  const w = r.respondent ?? {};
  let email: string | undefined;
  try {
    email = w.email ? decryptSensitiveData(w.email) : undefined;
  } catch {
    email = undefined;
  }
  return {
    respondent: {
      ...(w.name && { name: w.name }),
      ...(email && { email }),
      ...(w.universityId && { universityId: String(w.universityId) }),
      ...(w.universityName && { universityName: w.universityName }),
      ...(w.facultyId && { facultyId: String(w.facultyId) }),
      ...(w.facultyName && { facultyName: w.facultyName }),
      ...(w.departmentId && { departmentId: String(w.departmentId) }),
      ...(w.departmentName && { departmentName: w.departmentName }),
      ...(w.schoolUnlisted && { schoolUnlisted: true }),
      ...(w.level && { level: w.level }),
      ...(w.role && { role: w.role }),
    },
    answers: r.answers ?? {},
    submittedAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

/** "About you" filled in from a signed-in person's profile (they can change it). */
export async function profilePrefill(session: SessionUser): Promise<RespondentInput> {
  const User = await getUserModel();
  const u = await User.findById(session.userId)
    .select("fullName email role level universityId universityName facultyId facultyName departmentId departmentName")
    .lean();
  if (!u) return {};
  let email: string | undefined;
  try {
    email = u.email ? decryptSensitiveData(u.email) : undefined;
  } catch {
    email = undefined;
  }
  const level = SURVEY_LEVELS.find((l) => l === u.level);
  const role = u.role === "lecturer" ? "lecturer" : level || u.universityId ? "student" : undefined;
  return {
    ...(u.fullName && { name: u.fullName }),
    ...(email && { email }),
    ...(u.universityId && { universityId: String(u.universityId), universityName: u.universityName }),
    ...(u.universityId && u.facultyId && { facultyId: String(u.facultyId), facultyName: u.facultyName }),
    ...(u.universityId && u.facultyId && u.departmentId && { departmentId: String(u.departmentId), departmentName: u.departmentName }),
    ...(level && { level }),
    ...(role && RESPONDENT_ROLES.some((r) => r.value === role) && { role }),
  };
}
