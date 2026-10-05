// src/lib/models/surveyResponseModel.ts
// One person's answers to a survey. Signed-in people are keyed by userId;
// signed-out people by a random key kept in an httpOnly cookie (only its
// hash is stored), so either can come back and change their answers until
// the survey closes. Answers are keyed by question id (lib/survey/questions.ts).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { Answers } from "@/lib/survey/questions";

export interface ISurveyRespondent {
  name?: string;
  /** Encrypted (encryptSensitiveData) with a search hash */
  email?: string;
  emailHash?: string;
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  /** Typed a school we don't list (it went to the suggestion queue) */
  schoolUnlisted?: boolean;
  level?: string;
  role?: string;
}

export interface ISurveyResponse {
  _id: Types.ObjectId;
  surveyId: Types.ObjectId;
  userId?: Types.ObjectId;
  respondentKeyHash?: string;
  respondent: ISurveyRespondent;
  /** The school suggestion this respondent's typed school or faculty feeds */
  schoolSuggestionId?: Types.ObjectId;
  answers: Answers;
  ipHash?: string;
  editCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ISurveyResponseModel = Model<ISurveyResponse>;

const RespondentSchema = new Schema<ISurveyRespondent>(
  {
    name: String,
    email: String,
    emailHash: String,
    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: String,
    universityAbbr: String,
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: String,
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: String,
    schoolUnlisted: Boolean,
    level: String,
    role: String,
  },
  { _id: false },
);

const SurveyResponseSchema = new Schema<ISurveyResponse, ISurveyResponseModel>(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: "Survey", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    respondentKeyHash: String,
    respondent: { type: RespondentSchema, default: {} },
    schoolSuggestionId: { type: Schema.Types.ObjectId, ref: "SchoolSuggestion" },
    answers: { type: Schema.Types.Mixed, default: {} },
    ipHash: String,
    editCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "surveyresponses", minimize: false },
);

// One response per person per survey (partial: a sparse compound index
// would still index every document, since surveyId is always set)
SurveyResponseSchema.index(
  { surveyId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } },
);
SurveyResponseSchema.index(
  { surveyId: 1, respondentKeyHash: 1 },
  { unique: true, partialFilterExpression: { respondentKeyHash: { $exists: true } } },
);
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });
SurveyResponseSchema.index({ userId: 1 }, { partialFilterExpression: { userId: { $exists: true } } });
SurveyResponseSchema.index(
  { schoolSuggestionId: 1 },
  { partialFilterExpression: { schoolSuggestionId: { $exists: true } } },
);

export async function getSurveyResponseModel(): Promise<ISurveyResponseModel> {
  const conn = await connectDB();
  return (
    (conn.models.SurveyResponse as ISurveyResponseModel | undefined) ??
    conn.model<ISurveyResponse, ISurveyResponseModel>("SurveyResponse", SurveyResponseSchema)
  );
}
