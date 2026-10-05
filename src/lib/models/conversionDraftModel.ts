// src/lib/models/conversionDraftModel.ts
// A contributor's in-progress conversion in the workspace
// (/contribute/[materialId]): the editor's state, synced from the browser's
// local copy (see lib/conversions.ts). Finished work lives in the usual
// TypedQuestion / ContentDocument records; this only holds what isn't done.
//
// revision is bumped on every save; a save based on an older revision is
// refused, so two devices can't silently overwrite each other.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { CONVERSION_KINDS, DRAFT_LIMITS, type ConversionKind, type DraftPayload } from "@/lib/conversions";

export interface IConversionDraft {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userUpid: string;
  materialId: Types.ObjectId;
  kind: ConversionKind;
  /** The published note being edited; absent for new work. */
  targetDocId?: Types.ObjectId;
  /** targetDocId as a string, or "new": part of the one-active-draft key. */
  targetKey: string;
  /** The note's updatedAt when this edit started (edit conflicts on submit). */
  baseDocUpdatedAt?: Date;
  payload: DraftPayload;
  revision: number;
  lastDeviceId?: string;
  lastPage?: number;
  status: "active" | "submitted" | "abandoned";
  submittedAt?: Date;
  /** Deleted by MongoDB at this time; pushed forward on every save. */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IConversionDraftModel = Model<IConversionDraft>;

export const draftExpiry = (from = new Date()) =>
  new Date(from.getTime() + DRAFT_LIMITS.deleteAfterDays * 24 * 60 * 60 * 1000);

const ConversionDraftSchema = new Schema<IConversionDraft, IConversionDraftModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    kind: { type: String, enum: CONVERSION_KINDS, required: true },
    targetDocId: { type: Schema.Types.ObjectId, ref: "ContentDocument" },
    targetKey: { type: String, required: true },
    baseDocUpdatedAt: { type: Date },
    payload: { type: Schema.Types.Mixed, required: true },
    revision: { type: Number, required: true, default: 1 },
    lastDeviceId: { type: String, maxlength: 64 },
    lastPage: { type: Number, min: 1 },
    status: { type: String, enum: ["active", "submitted", "abandoned"], default: "active" },
    submittedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

// One active draft per user, material, kind and target
ConversionDraftSchema.index(
  { userId: 1, materialId: 1, kind: 1, targetKey: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);
ConversionDraftSchema.index({ userId: 1, status: 1, updatedAt: -1 });
// "N people typing" on materials that need typing (lib/needsTyping.ts)
ConversionDraftSchema.index({ materialId: 1, status: 1 });
ConversionDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export async function getConversionDraftModel(): Promise<IConversionDraftModel> {
  const conn = await connectDB();
  return (
    (conn.models.ConversionDraft as IConversionDraftModel | undefined) ??
    conn.model<IConversionDraft, IConversionDraftModel>("ConversionDraft", ConversionDraftSchema)
  );
}
