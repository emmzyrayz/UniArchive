// src/lib/models/roleApplicationModel.ts
// A self-service application for the next role (student -> collaborator,
// collaborator -> auditor). At most one pending application per user; the
// eligibility the applicant had when applying is frozen in a snapshot so
// reviewers see what the decision was based on.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export type RoleApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type ApplicableRole = "collaborator" | "auditor";

export const ROLE_APPLICATION_STATUSES: RoleApplicationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
];

export interface IEligibilitySnapshot {
  verifiedMaterialCount: number;
  accountAgeDays: number;
  profileCompletionPercent: number;
  hasPhone: boolean;
  violationCount: number;
  /** Only for auditor applications */
  monthsAsCollaborator?: number;
  currentRole: string;
  checkedAt: Date;
}

export interface IRoleApplication {
  _id: Types.ObjectId;
  applicantId: Types.ObjectId; // ref: User
  applicantUpid: string;
  applicantName: string;
  currentRole: string;
  targetRole: ApplicableRole;

  supportingNote?: string;
  eligibilitySnapshot: IEligibilitySnapshot;

  status: RoleApplicationStatus;
  appliedAt: Date;

  reviewedBy?: Types.ObjectId; // ref: User
  reviewedByUpid?: string;
  reviewedAt?: Date;
  reviewNote?: string; // shown to the applicant

  // Set when the application is closed because the applicant's role changed
  // some other way before it was reviewed
  autoWithdrawnReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type IRoleApplicationModel = Model<IRoleApplication>;

const EligibilitySnapshotSchema = new Schema<IEligibilitySnapshot>(
  {
    verifiedMaterialCount: { type: Number, required: true },
    accountAgeDays: { type: Number, required: true },
    profileCompletionPercent: { type: Number, required: true },
    hasPhone: { type: Boolean, required: true },
    violationCount: { type: Number, required: true, default: 0 },
    monthsAsCollaborator: { type: Number },
    currentRole: { type: String, required: true },
    checkedAt: { type: Date, required: true },
  },
  { _id: false },
);

const RoleApplicationSchema = new Schema<IRoleApplication, IRoleApplicationModel>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicantUpid: { type: String, required: true },
    applicantName: { type: String, required: true },
    currentRole: { type: String, required: true },
    targetRole: { type: String, enum: ["collaborator", "auditor"], required: true },
    supportingNote: { type: String, maxlength: 1000 },
    eligibilitySnapshot: { type: EligibilitySnapshotSchema, required: true },
    status: { type: String, enum: ROLE_APPLICATION_STATUSES, default: "pending" },
    appliedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedByUpid: { type: String },
    reviewedAt: { type: Date },
    reviewNote: { type: String, maxlength: 1000 },
    autoWithdrawnReason: { type: String },
  },
  { timestamps: true },
);

// One pending application per user at a time (enforced even under a race)
RoleApplicationSchema.index(
  { applicantId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
// The applicant's latest application
RoleApplicationSchema.index({ applicantId: 1, appliedAt: -1 });
// The admin queue, oldest first
RoleApplicationSchema.index({ status: 1, appliedAt: 1 });

export async function getRoleApplicationModel(): Promise<IRoleApplicationModel> {
  const conn = await connectDB();
  return (
    (conn.models.RoleApplication as IRoleApplicationModel | undefined) ??
    conn.model<IRoleApplication, IRoleApplicationModel>("RoleApplication", RoleApplicationSchema)
  );
}
