// src/lib/models/typedAnswerModel.ts
// A community answer to a TypedQuestion (Layer 2). Many users can answer the
// same question, one answer each; a lecturer (or ed_admin+) accepts one.
// The accepter must not be the answer's author — enforced at the API level.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface ITypedAnswer {
  _id: Types.ObjectId;

  questionId: Types.ObjectId; // ref: TypedQuestion
  materialId: Types.ObjectId; // ref: Material (denormalised for queries)
  submittedBy: Types.ObjectId;
  submittedByUpid: string;

  // Content (rich text + KaTeX)
  answerText: string;
  workings?: string; // calculation questions
  explanation?: string; // why this is correct
  selectedOption?: string; // objective questions: "A", "B", ...

  // Moderation
  isAccepted: boolean;
  acceptedBy?: Types.ObjectId; // lecturer+
  acceptedAt?: Date;

  // Engagement
  upvoteCount: number;
  reportCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ITypedAnswerModel = Model<ITypedAnswer>;

const TypedAnswerSchema = new Schema<ITypedAnswer, ITypedAnswerModel>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "TypedQuestion",
      required: true,
      index: true,
    },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },

    answerText: { type: String, required: true },
    workings: { type: String },
    explanation: { type: String },
    selectedOption: { type: String },

    isAccepted: { type: Boolean, default: false },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date },

    upvoteCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

TypedAnswerSchema.index({ questionId: 1, isAccepted: 1 });
TypedAnswerSchema.index({ questionId: 1, upvoteCount: -1 });
// One answer per user per question
TypedAnswerSchema.index({ questionId: 1, submittedBy: 1 }, { unique: true });

export async function getTypedAnswerModel(): Promise<ITypedAnswerModel> {
  const conn = await connectDB();
  return (
    (conn.models.TypedAnswer as ITypedAnswerModel | undefined) ??
    conn.model<ITypedAnswer, ITypedAnswerModel>("TypedAnswer", TypedAnswerSchema)
  );
}
