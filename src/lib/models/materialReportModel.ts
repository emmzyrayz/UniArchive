// src/lib/models/materialReportModel.ts
// A reader's report on a UniLibrary material: one per person per material.
// Unverified PDFs with REPORTS_TO_HIDE reports leave the listing until staff
// look (POST /api/materials/[id]/report).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { MATERIAL_REPORT_REASONS, type MaterialReportReason } from "@/lib/constants/materialReports";

export { MATERIAL_REPORT_REASONS, type MaterialReportReason };

export interface IMaterialReport {
  _id: Types.ObjectId;
  materialId: Types.ObjectId;
  userId: Types.ObjectId;
  userUpid: string;
  reason: MaterialReportReason;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IMaterialReportModel = Model<IMaterialReport>;

const MaterialReportSchema = new Schema<IMaterialReport, IMaterialReportModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    reason: { type: String, enum: MATERIAL_REPORT_REASONS.map((r) => r.value), required: true },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true, collection: "materialreports" },
);

MaterialReportSchema.index({ materialId: 1, userId: 1 }, { unique: true });
MaterialReportSchema.index({ userId: 1 });

export async function getMaterialReportModel(): Promise<IMaterialReportModel> {
  const conn = await connectDB();
  return (
    (conn.models.MaterialReport as IMaterialReportModel | undefined) ??
    conn.model<IMaterialReport, IMaterialReportModel>("MaterialReport", MaterialReportSchema)
  );
}
