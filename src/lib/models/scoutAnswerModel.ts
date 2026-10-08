// src/lib/models/scoutAnswerModel.ts
// One person's answer to one voted Scout task (lib/scouts): "Is this
// readable?" on a Material, "Check a typed answer" on a TypedQuestion.
// Status moves pending -> confirmed (agreed with the result: paid) or
// disagreed (no credit, no penalty), or stuck (no agreement: staff decide);
// overturned when staff later reverse the result (credits taken back).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { VOTED_TASKS, type VotedTask } from "@/lib/scouts/taskTypes";

export const SCOUT_ANSWER_STATUSES = ["pending", "confirmed", "disagreed", "stuck", "overturned"] as const;
export type ScoutAnswerStatus = (typeof SCOUT_ANSWER_STATUSES)[number];

export interface IScoutAnswer {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  task: VotedTask;
  subjectId: Types.ObjectId; // Material (readable) or TypedQuestion (check_typed)
  // The material it's about, for both tasks (staff views, nearness)
  materialId: Types.ObjectId;
  answer: string;
  note?: string;
  status: ScoutAnswerStatus;
  // False while the person's accuracy is too low: kept, not counted or paid
  counted: boolean;
  // Streak multiplier when they answered (applied when it's paid)
  multiplier: number;
  createdAt: Date;
  settledAt?: Date;
}

export type IScoutAnswerModel = Model<IScoutAnswer>;

const ScoutAnswerSchema = new Schema<IScoutAnswer, IScoutAnswerModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: String, enum: VOTED_TASKS, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    answer: { type: String, required: true, maxlength: 40 },
    note: { type: String, maxlength: 300 },
    status: { type: String, enum: SCOUT_ANSWER_STATUSES, default: "pending" },
    counted: { type: Boolean, default: true },
    multiplier: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    settledAt: { type: Date },
  },
  { versionKey: false },
);

// One answer per person per subject
ScoutAnswerSchema.index({ userId: 1, task: 1, subjectId: 1 }, { unique: true });
// Settling a subject
ScoutAnswerSchema.index({ task: 1, subjectId: 1, status: 1 });
// Accuracy and history
ScoutAnswerSchema.index({ userId: 1, task: 1, status: 1 });
// Streaks (answers per Lagos day)
ScoutAnswerSchema.index({ userId: 1, createdAt: -1 });

export async function getScoutAnswerModel(): Promise<IScoutAnswerModel> {
  const conn = await connectDB();
  return (
    (conn.models.ScoutAnswer as IScoutAnswerModel | undefined) ??
    conn.model<IScoutAnswer, IScoutAnswerModel>("ScoutAnswer", ScoutAnswerSchema)
  );
}
