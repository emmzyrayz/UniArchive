// src/lib/models/typedQuestionModel.ts
// A past question typed out in structured form (Layer 2). Always linked to a
// Layer 1 Material whose subcategory is PAST_QUESTION. Each question is its
// own record so answers can be contributed independently per question.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

import { QUESTION_TYPES, type QuestionType } from "@/lib/constants/layer2";

export { QUESTION_TYPES, type QuestionType };

export interface IQuestionOption {
  label: string; // "A", "B", "C", "D"
  text: string; // may contain KaTeX
  isCorrect?: boolean; // only revealed after tier-1 verification
}

export interface ITypedQuestion {
  _id: Types.ObjectId;

  // Parent material (Layer 1)
  materialId: Types.ObjectId;
  submittedBy: Types.ObjectId; // who typed this question
  submittedByUpid: string;

  // Question content
  questionNumber: number; // 1, 2, 3...
  questionPart?: string; // "a", "b", "c" for sub-questions
  questionText: string; // plain text + KaTeX markup
  questionType: QuestionType;
  marks?: number;
  options?: IQuestionOption[]; // objective questions

  // The accepted answer (set after tier-2 verification)
  acceptedAnswerId?: Types.ObjectId;

  // Status
  status: "pending" | "verified" | "disputed";
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  // Archive Scouts' "Check a typed answer" (lib/scouts): votes so far, then the result
  scoutCheck?: {
    votes?: number;
    result?: "correct" | "mistakes" | "wrong_question";
    // What the checkers said was wrong (on "mistakes" / "wrong_question")
    notes?: string[];
    stuck?: boolean;
    settledAt?: Date;
  };

  // Denormalised, updated when an answer is submitted
  answerCount: number;

  // Contribution stats (dashboard Conversions tab)
  wordCount?: number;
  // Idempotency key from the conversion workspace ("<draft>:<item>"), so a
  // retried submit returns this question instead of creating another
  submissionKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type ITypedQuestionModel = Model<ITypedQuestion>;

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    label: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean },
  },
  { _id: false },
);

const TypedQuestionSchema = new Schema<ITypedQuestion, ITypedQuestionModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },

    questionNumber: { type: Number, required: true, min: 1 },
    questionPart: { type: String, trim: true, lowercase: true },
    questionText: { type: String, required: true },
    questionType: { type: String, required: true, enum: QUESTION_TYPES, default: "theory" },
    marks: { type: Number, min: 0 },
    options: [QuestionOptionSchema],

    acceptedAnswerId: { type: Schema.Types.ObjectId, ref: "TypedAnswer" },

    status: { type: String, enum: ["pending", "verified", "disputed"], default: "pending" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    scoutCheck: {
      votes: { type: Number },
      result: { type: String, enum: ["correct", "mistakes", "wrong_question"] },
      notes: { type: [String], default: undefined },
      stuck: { type: Boolean },
      settledAt: { type: Date },
    },

    answerCount: { type: Number, default: 0 },
    wordCount: { type: Number, min: 0 },
    submissionKey: { type: String },
  },
  { timestamps: true },
);

// One record per question number (and part) per material. A missing part
// indexes as null, so "1" and "1a" are distinct but two plain "1"s are not.
TypedQuestionSchema.index(
  { materialId: 1, questionNumber: 1, questionPart: 1 },
  { unique: true },
);
TypedQuestionSchema.index({ materialId: 1, status: 1 });
TypedQuestionSchema.index({ submittedBy: 1, createdAt: -1 });
TypedQuestionSchema.index({ submissionKey: 1 }, { unique: true, sparse: true });

export async function getTypedQuestionModel(): Promise<ITypedQuestionModel> {
  const conn = await connectDB();
  return (
    (conn.models.TypedQuestion as ITypedQuestionModel | undefined) ??
    conn.model<ITypedQuestion, ITypedQuestionModel>("TypedQuestion", TypedQuestionSchema)
  );
}
