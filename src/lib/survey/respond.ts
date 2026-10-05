// src/lib/survey/respond.ts
// Saving a survey response: validation (lib/survey/questions.ts), the
// respondent's school checked against the catalog, unlisted schools,
// faculties and departments queued as school suggestions, and one response
// per person (signed-in user, or the anonymous key cookie) that they can
// change until the survey closes.
import { createHash, randomBytes } from "crypto";
import { Types } from "mongoose";
import type { SessionUser } from "@/lib/auth/session";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { escapeRegex } from "@/lib/escapeRegex";
import { classifySuggestion } from "@/lib/schoolSuggestions";
import { ACTIVE_SUGGESTION_STATUSES, getSchoolSuggestionModel, type ISchoolSuggestion } from "@/lib/models/schoolSuggestionModel";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";
import { getSurveyModel, isAcceptingResponses, type ISurvey } from "@/lib/models/surveyModel";
import { getSurveyResponseModel, type ISurveyRespondent, type ISurveyResponse } from "@/lib/models/surveyResponseModel";
import { cleanAnswers, cleanRespondent, cleanRespondentConfig, type RespondentInput } from "./questions";

/** httpOnly cookie holding a signed-out respondent's key (hashed in the DB). */
export const SURVEY_KEY_COOKIE = "ua_survey_key";
export const SURVEY_KEY_MAX_AGE = 365 * 24 * 3600;
const KEY = /^[A-Za-z0-9_-]{43}$/;

export const newSurveyKey = () => randomBytes(32).toString("base64url");
export const hashSurveyKey = (key: string | undefined) =>
  key && KEY.test(key) ? createHash("sha256").update(`survey-key:${key}`).digest("hex") : undefined;

/** Minimum time between opening the form and submitting it (bots are faster). */
export const MIN_FILL_MS = 3000;

export class SurveyError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}

// --- The respondent's school --------------------------------------------------

type SchoolFields = Pick<
  ISurveyRespondent,
  | "universityId"
  | "universityName"
  | "universityAbbr"
  | "facultyId"
  | "facultyName"
  | "departmentId"
  | "departmentName"
  | "schoolUnlisted"
>;

const sameName = (name: string) => ({ $regex: `^${escapeRegex(name)}$`, $options: "i" });

/**
 * Checks the picked catalog records and turns typed parts into a school
 * suggestion: an existing one for the same school, faculty and department
 * if there is one (its priority goes up), else a new "survey" suggestion.
 * `previousSuggestionId` (an edit) isn't counted twice.
 */
export async function resolveSchool(
  input: RespondentInput,
  surveyId: Types.ObjectId,
  previousSuggestionId?: Types.ObjectId,
): Promise<{ school: SchoolFields; suggestionId?: Types.ObjectId }> {
  const school: SchoolFields = {};
  if (input.universityId) {
    const University = await getUniversityModel();
    const uni = await University.findOne({ _id: input.universityId, isActive: true }).select("name abbreviation").lean();
    if (!uni) throw new SurveyError(400, "That school isn't available any more. Pick it again.", { "about.school": "Pick your school again." });
    Object.assign(school, { universityId: uni._id, universityName: uni.name, universityAbbr: uni.abbreviation });
    if (input.facultyId) {
      const Faculty = await getFacultyModel();
      const f = await Faculty.findOne({ _id: input.facultyId, universityId: uni._id, isActive: true }).select("name").lean();
      if (!f) throw new SurveyError(400, "That faculty isn't available any more. Pick it again.", { "about.school": "Pick your faculty again." });
      Object.assign(school, { facultyId: f._id, facultyName: f.name });
      if (input.departmentId) {
        const Department = await getDepartmentModel();
        const d = await Department.findOne({ _id: input.departmentId, facultyId: f._id, isActive: true }).select("name").lean();
        if (!d) throw new SurveyError(400, "That department isn't available any more. Pick it again.", { "about.school": "Pick your department again." });
        Object.assign(school, { departmentId: d._id, departmentName: d.name });
      }
    }
  } else if (input.schoolUnlisted && input.universityName) {
    Object.assign(school, { universityName: input.universityName, schoolUnlisted: true });
  } else {
    return { school };
  }
  if (!school.facultyId && input.facultyName) school.facultyName = input.facultyName;
  if (!school.departmentId && input.departmentName) school.departmentName = input.departmentName;

  // Everything picked from the catalog (or nothing typed below the school)
  const typed = school.schoolUnlisted || (!school.facultyId && input.facultyName) || (!school.departmentId && input.departmentName);
  if (!typed || !school.facultyName || !school.departmentName) return { school };

  const result = await classifySuggestion({
    universityName: school.universityName!,
    facultyName: school.facultyName,
    departmentName: school.departmentName,
  });
  if (result.outcome === "auto_resolved") {
    const University = await getUniversityModel();
    const uni = await University.findById(result.university.id).select("abbreviation").lean();
    return {
      school: {
        universityId: new Types.ObjectId(result.university.id),
        universityName: result.university.name,
        universityAbbr: uni?.abbreviation ?? result.university.abbreviation,
        facultyId: new Types.ObjectId(result.faculty.id),
        facultyName: result.faculty.name,
        departmentId: new Types.ObjectId(result.department.id),
        departmentName: result.department.name,
      },
    };
  }
  if (result.existingUniversity) {
    Object.assign(school, {
      universityId: new Types.ObjectId(result.existingUniversity.id),
      universityName: result.existingUniversity.name,
      universityAbbr: result.existingUniversity.abbreviation,
    });
    delete school.schoolUnlisted;
  }
  if (result.existingFaculty) {
    Object.assign(school, { facultyId: new Types.ObjectId(result.existingFaculty.id), facultyName: result.existingFaculty.name });
  }

  // One suggestion per school + faculty + department, however many name it
  const Suggestion = await getSchoolSuggestionModel();
  const match: Record<string, unknown> = {
    status: { $in: ACTIVE_SUGGESTION_STATUSES },
    suggestionScope: result.scope,
    suggestedFacultyName: sameName(school.facultyName),
    suggestedDepartmentName: sameName(school.departmentName),
  };
  if (result.scope === "full") match.suggestedUniversityName = sameName(school.universityName!);
  else match.existingUniversityId = school.universityId;
  if (result.scope === "department_only") match.existingFacultyId = school.facultyId;
  const existing = await Suggestion.findOne(match).select("_id").lean<Pick<ISchoolSuggestion, "_id">>();
  if (existing) {
    if (!previousSuggestionId?.equals(existing._id)) {
      await Suggestion.updateOne({ _id: existing._id }, { $inc: { adminPriority: 1 } });
    }
    return { school, suggestionId: existing._id };
  }

  const now = new Date();
  const created = await Suggestion.create({
    suggestedUniversityName: school.universityName,
    suggestedFacultyName: school.facultyName,
    suggestedDepartmentName: school.departmentName,
    source: "survey",
    surveyId,
    submittedAt: now,
    canWithdrawUntil: now,
    suggestionScope: result.scope,
    existingUniversityId: result.existingUniversity?.id,
    existingFacultyId: result.existingFaculty?.id,
    status: result.status,
    linkedToSuggestionId: result.linkedToSuggestionId,
    duplicateOfUniversityId: result.duplicateOfUniversityId,
    adminPriority: 1,
  });
  if (result.linkedToSuggestionId) {
    await Suggestion.updateOne({ _id: result.linkedToSuggestionId }, { $inc: { adminPriority: 1 } });
  }
  return { school, suggestionId: created._id };
}

// --- Submitting ---------------------------------------------------------------

export interface SubmitInput {
  survey: ISurvey;
  session: SessionUser | null;
  /** Hash of the anonymous key cookie (signed out only) */
  keyHash?: string;
  ip: string;
  respondent: unknown;
  answers: unknown;
}

/** Validates and saves (or updates) this person's response. */
export async function submitSurveyResponse(input: SubmitInput): Promise<{ created: boolean; response: ISurveyResponse }> {
  const { survey, session, keyHash } = input;
  if (!isAcceptingResponses(survey)) throw new SurveyError(409, "This survey isn't taking answers right now.");
  if (!session && !keyHash) throw new SurveyError(400, "Missing respondent key.");

  const config = cleanRespondentConfig(survey.respondentFields);
  const { respondent: who, errors: whoErrors } = cleanRespondent(config, input.respondent);
  const { answers, errors: answerErrors } = cleanAnswers(survey.questions, input.answers);
  const errors = { ...prefix("about.", whoErrors), ...answerErrors };
  if (Object.keys(errors).length) throw new SurveyError(400, "Some answers need another look.", errors);

  const Response = await getSurveyResponseModel();
  const owner = session ? { surveyId: survey._id, userId: new Types.ObjectId(session.userId) } : { surveyId: survey._id, respondentKeyHash: keyHash };
  const existing = await Response.findOne(owner).select("_id schoolSuggestionId").lean<Pick<ISurveyResponse, "_id" | "schoolSuggestionId">>();

  const { school, suggestionId } =
    config.school === "off" ? { school: {}, suggestionId: undefined } : await resolveSchool(who, survey._id, existing?.schoolSuggestionId);
  const respondent: ISurveyRespondent = {
    ...(who.name && { name: who.name }),
    ...(who.email && { email: encryptSensitiveData(who.email), emailHash: hashForSearch(who.email) }),
    ...school,
    ...(who.level && { level: who.level }),
    ...(who.role && { role: who.role }),
  };
  const ipHash = hashForSearch(`survey-ip:${input.ip}`);

  const update = async (id: Types.ObjectId) => {
    const doc = await Response.findByIdAndUpdate(
      id,
      {
        $set: { respondent, answers, ipHash, ...(suggestionId && { schoolSuggestionId: suggestionId }) },
        ...(!suggestionId && { $unset: { schoolSuggestionId: "" } }),
        $inc: { editCount: 1 },
      },
      { returnDocument: "after" },
    ).lean<ISurveyResponse>();
    return { created: false, response: doc! };
  };
  if (existing) return update(existing._id);

  try {
    const doc = await Response.create({ ...owner, respondent, answers, ipHash, ...(suggestionId && { schoolSuggestionId: suggestionId }) });
    const Survey = await getSurveyModel();
    await Survey.updateOne({ _id: survey._id }, { $inc: { responseCount: 1 } });
    return { created: true, response: doc.toObject() };
  } catch (error) {
    // Two submits at once from the same person: the other one won, update it
    if ((error as { code?: number }).code === 11000) {
      const winner = await Response.findOne(owner).select("_id").lean<Pick<ISurveyResponse, "_id">>();
      if (winner) return update(winner._id);
    }
    throw error;
  }
}

function prefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [p + k, v]));
}
