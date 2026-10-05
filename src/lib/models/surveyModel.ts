// src/lib/models/surveyModel.ts
// A survey built in /admin/surveys and answered at /surveys/<slug>, by
// anyone, signed in or not. Questions and the "about you" fields are
// defined and validated in lib/survey/questions.ts.
//
// Status: draft -> open -> closed (and back to open). Once a survey has
// responses its questions are locked to compatible edits (lockedChanges).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { RespondentConfig, SurveyQuestion } from "@/lib/survey/questions";

export type SurveyStatus = "draft" | "open" | "closed";

interface StaffRef {
  userId: Types.ObjectId;
  upid: string;
  name: string;
}

export interface ISurvey {
  _id: Types.ObjectId;
  /** URL name: /surveys/<slug> */
  slug: string;
  title: string;
  intro: string;
  thankYouMessage: string;
  status: SurveyStatus;
  /** Optional window; outside it an "open" survey takes no answers */
  opensAt?: Date;
  closesAt?: Date;
  respondentFields: RespondentConfig;
  questions: SurveyQuestion[];
  responseCount: number;
  createdBy: StaffRef;
  updatedBy: StaffRef;
  openedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ISurveyModel = Model<ISurvey>;

const StaffRefSchema = new Schema<StaffRef>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    upid: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const SurveySchema = new Schema<ISurvey, ISurveyModel>(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 150 },
    intro: { type: String, default: "", maxlength: 3000 },
    thankYouMessage: { type: String, default: "", maxlength: 1000 },
    status: { type: String, enum: ["draft", "open", "closed"], default: "draft" },
    opensAt: { type: Date },
    closesAt: { type: Date },
    respondentFields: { type: Schema.Types.Mixed, required: true },
    questions: { type: Schema.Types.Mixed, default: [] },
    responseCount: { type: Number, default: 0 },
    createdBy: { type: StaffRefSchema, required: true },
    updatedBy: { type: StaffRefSchema, required: true },
    openedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true, minimize: false },
);

SurveySchema.index({ status: 1, updatedAt: -1 });

export async function getSurveyModel(): Promise<ISurveyModel> {
  const conn = await connectDB();
  return (conn.models.Survey as ISurveyModel | undefined) ?? conn.model<ISurvey, ISurveyModel>("Survey", SurveySchema);
}

/** Whether the survey takes answers right now. */
export function isAcceptingResponses(s: Pick<ISurvey, "status" | "opensAt" | "closesAt">, now = new Date()): boolean {
  if (s.status !== "open") return false;
  if (s.opensAt && now < new Date(s.opensAt)) return false;
  if (s.closesAt && now >= new Date(s.closesAt)) return false;
  return true;
}
