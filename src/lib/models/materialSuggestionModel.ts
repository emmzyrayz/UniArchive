// src/lib/models/materialSuggestionModel.ts
// A reader's "Help identify this PDF": the details they believe an
// unverified material has, in the same shape as a submission. One per
// person per material (editable while pending). Staff accept one with one
// click, which verifies the material (lib/materialSuggestions.ts).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const SUGGESTION_STATUSES = ["pending", "accepted", "declined"] as const;
export type MaterialSuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export interface MaterialSuggestionFields {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  courseCode?: string;
  courseName?: string;
  level?: string;
  semester?: string;
  academicYear?: string;
}

export interface IMaterialSuggestion {
  _id: Types.ObjectId;
  materialId: Types.ObjectId;
  userId: Types.ObjectId;
  userUpid: string;
  fields: MaterialSuggestionFields;
  /** Category + course code + school + level, normalised: "3 people agree" */
  fingerprint: string;
  status: MaterialSuggestionStatus;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IMaterialSuggestionModel = Model<IMaterialSuggestion>;

const FieldsSchema = new Schema<MaterialSuggestionFields>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000, default: "" },
    category: { type: String, required: true },
    subcategory: String,
    tags: [String],
    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: String,
    universityAbbr: String,
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: String,
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: String,
    courseCode: String,
    courseName: String,
    level: String,
    semester: String,
    academicYear: String,
  },
  { _id: false },
);

const MaterialSuggestionSchema = new Schema<IMaterialSuggestion, IMaterialSuggestionModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    fields: { type: FieldsSchema, required: true },
    fingerprint: { type: String, required: true },
    status: { type: String, enum: SUGGESTION_STATUSES, default: "pending" },
    decidedAt: Date,
  },
  { timestamps: true, collection: "materialsuggestions" },
);

MaterialSuggestionSchema.index({ materialId: 1, userId: 1 }, { unique: true });
MaterialSuggestionSchema.index({ materialId: 1, status: 1, fingerprint: 1 });
MaterialSuggestionSchema.index({ userId: 1, status: 1 });

export async function getMaterialSuggestionModel(): Promise<IMaterialSuggestionModel> {
  const conn = await connectDB();
  return (
    (conn.models.MaterialSuggestion as IMaterialSuggestionModel | undefined) ??
    conn.model<IMaterialSuggestion, IMaterialSuggestionModel>("MaterialSuggestion", MaterialSuggestionSchema)
  );
}
