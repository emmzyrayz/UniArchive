// src/lib/models/schoolSuggestionModel.ts
// A student's request to add a university, faculty or department that isn't
// on the platform yet. Admins review them; duplicates are detected at
// submission time (see src/lib/schoolSuggestions.ts).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { UniversityOwnership } from "@/lib/models/university/universityModel";

export const SUGGESTION_SCOPES = ["full", "faculty_department", "department_only"] as const;
export type SuggestionScope = (typeof SUGGESTION_SCOPES)[number];

export const SUGGESTION_STATUSES = [
  "pending",
  "possible_duplicate",
  "linked_duplicate",
  "approved",
  "rejected",
  "withdrawn",
  "auto_resolved",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/** Statuses that still await an admin decision. */
export const ACTIVE_SUGGESTION_STATUSES: SuggestionStatus[] = [
  "pending",
  "possible_duplicate",
  "linked_duplicate",
];

export interface ISchoolSuggestion {
  _id: Types.ObjectId;

  // What the student typed
  suggestedUniversityName: string;
  suggestedUniversityAbbr?: string;
  suggestedUniversityState?: string;
  suggestedUniversityOwnership?: UniversityOwnership;
  suggestedFacultyName: string;
  suggestedDepartmentName: string;

  // Who and when
  submittedBy: Types.ObjectId;
  submittedByUpid: string;
  submittedAt: Date;
  canWithdrawUntil: Date; // submittedAt + 24h

  // What already exists (set by duplicate detection)
  suggestionScope: SuggestionScope;
  existingUniversityId?: Types.ObjectId;
  existingFacultyId?: Types.ObjectId;

  // Review state
  status: SuggestionStatus;
  linkedToSuggestionId?: Types.ObjectId;
  duplicateOfUniversityId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  adminPriority: number; // +1 per linked duplicate

  // Records created on approval
  createdUniversityId?: Types.ObjectId;
  createdFacultyId?: Types.ObjectId;
  createdDepartmentId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type ISchoolSuggestionModel = Model<ISchoolSuggestion>;

const SchoolSuggestionSchema = new Schema<ISchoolSuggestion, ISchoolSuggestionModel>(
  {
    suggestedUniversityName: { type: String, required: true, trim: true },
    suggestedUniversityAbbr: { type: String, trim: true },
    suggestedUniversityState: { type: String, trim: true },
    suggestedUniversityOwnership: { type: String, enum: ["Federal", "State", "Private"] },
    suggestedFacultyName: { type: String, required: true, trim: true },
    suggestedDepartmentName: { type: String, required: true, trim: true },

    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },
    submittedAt: { type: Date, required: true },
    canWithdrawUntil: { type: Date, required: true },

    suggestionScope: { type: String, enum: SUGGESTION_SCOPES, required: true },
    existingUniversityId: { type: Schema.Types.ObjectId, ref: "University" },
    existingFacultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },

    status: { type: String, enum: SUGGESTION_STATUSES, default: "pending" },
    linkedToSuggestionId: { type: Schema.Types.ObjectId, ref: "SchoolSuggestion" },
    duplicateOfUniversityId: { type: Schema.Types.ObjectId, ref: "University" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    adminPriority: { type: Number, default: 1 },

    createdUniversityId: { type: Schema.Types.ObjectId, ref: "University" },
    createdFacultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    createdDepartmentId: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true, collection: "schoolsuggestions" },
);

SchoolSuggestionSchema.index({ submittedBy: 1, status: 1 });
SchoolSuggestionSchema.index({ status: 1, adminPriority: -1 }); // admin queue order
SchoolSuggestionSchema.index({ linkedToSuggestionId: 1 });
SchoolSuggestionSchema.index({ existingUniversityId: 1, status: 1 });

export async function getSchoolSuggestionModel(): Promise<ISchoolSuggestionModel> {
  const conn = await connectDB();
  return (
    (conn.models.SchoolSuggestion as ISchoolSuggestionModel | undefined) ??
    conn.model<ISchoolSuggestion, ISchoolSuggestionModel>(
      "SchoolSuggestion",
      SchoolSuggestionSchema,
    )
  );
}
