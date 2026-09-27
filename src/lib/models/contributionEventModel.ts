// src/lib/models/contributionEventModel.ts
// Append-only ledger of contributions, one record per decision on a
// material. The audit trail behind role progression: User.verifiedMaterialCount
// is the fast counter, this is the history that explains it. Records are
// never updated; a later removal is a new "removed" record.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export type ContributionAction = "verified" | "rejected" | "removed";
// verified: the material passed tier 1 review
// rejected: a previously verified material was taken down for policy
// removed:  the material was deleted by its owner or an admin

export interface IContributionEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User (the contributor)
  userUpid: string;
  materialId: Types.ObjectId; // ref: Material
  materialTitle: string;
  submissionId: Types.ObjectId; // ref: MaterialSubmission
  action: ContributionAction;
  verifiedBy: Types.ObjectId; // ref: User (the reviewer)
  verifiedByUpid: string;
  verifiedByRole: string;
  verificationTier: "tier1" | "tier2";
  createdAt: Date;
}

export interface IContributionEventModel extends Model<IContributionEvent> {
  getVerifiedCount(userId: string): Promise<number>;
}

const ContributionEventSchema = new Schema<IContributionEvent, IContributionEventModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    materialTitle: { type: String, required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "MaterialSubmission", required: true },
    action: { type: String, enum: ["verified", "rejected", "removed"], required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verifiedByUpid: { type: String, required: true },
    verifiedByRole: { type: String, required: true },
    verificationTier: { type: String, enum: ["tier1", "tier2"], required: true },
  },
  // Append only: no updatedAt, no version key
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

ContributionEventSchema.index({ userId: 1, action: 1 });
ContributionEventSchema.index({ userId: 1, createdAt: -1 });
ContributionEventSchema.index({ materialId: 1 });

ContributionEventSchema.statics.getVerifiedCount = async function (
  userId: string,
): Promise<number> {
  return this.countDocuments({ userId, action: "verified" });
};

export async function getContributionEventModel(): Promise<IContributionEventModel> {
  const conn = await connectDB();
  return (
    (conn.models.ContributionEvent as IContributionEventModel | undefined) ??
    conn.model<IContributionEvent, IContributionEventModel>(
      "ContributionEvent",
      ContributionEventSchema,
    )
  );
}
