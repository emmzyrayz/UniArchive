// src/lib/models/materialModel.ts
// A verified UniLibrary material (Layer 1). Created only by a reviewer's
// tier-1 verification of a MaterialSubmission; one Material per submission.
// The file itself stays on the submitter's Book; this record carries the
// platform metadata and the verification trail.
//
// Tiers: tier1 (auditor+ checked it is real and relevant, green badge) and
// tier2 (a lecturer+ other than the submitter endorsed it, gold crown).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import {
  MATERIAL_CATEGORY_IDS,
  MATERIAL_SUBCATEGORY_IDS,
  type MaterialCategory,
  type MaterialSubcategory,
} from "@/lib/constants/materialCategories";

export type { MaterialCategory, MaterialSubcategory };
export type VerificationTier = "tier1" | "tier2";

export interface IMaterial {
  _id: Types.ObjectId;

  // Source references
  submissionId: Types.ObjectId; // ref: MaterialSubmission
  bookId: Types.ObjectId; // ref: Book (original upload)
  submittedBy: Types.ObjectId; // ref: User
  submittedByUpid: string;

  // Content metadata (same taxonomy as the submission form)
  title: string;
  description: string;
  category: MaterialCategory;
  subcategory?: MaterialSubcategory;
  tags: string[];
  language: string;

  // Academic context
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

  // Storage (copied from the Book). Signed read URLs are generated on
  // demand from these and never stored.
  storageProvider: "cloudinary" | "backblaze";
  storageKey: string; // B2 key or Cloudinary publicId
  fileSize: number;
  pageCount?: number;

  // Verification
  verificationTier: VerificationTier;

  // Tier 1 — any auditor+
  tier1VerifiedBy: Types.ObjectId;
  tier1VerifiedByUpid: string;
  tier1VerifiedAt: Date;
  tier1Note?: string;

  // Tier 2 — lecturer+ only, optional, cannot be self-verified
  tier2VerifiedBy?: Types.ObjectId;
  tier2VerifiedByUpid?: string;
  tier2VerifiedAt?: Date;
  tier2Note?: string;

  // Layer 2 typed content (TypedQuestion for past questions,
  // ContentDocument for notes/textbooks) exists for this material
  hasTypedContent: boolean;

  // Engagement
  viewCount: number;
  downloadCount: number;
  reportCount: number;

  // Visibility (an admin can deactivate a material)
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IMaterialModel extends Model<IMaterial> {
  findByDepartment(
    departmentId: string,
    category?: MaterialCategory,
    limit?: number,
  ): Promise<IMaterial[]>;
}

const MaterialSchema = new Schema<IMaterial, IMaterialModel>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: "MaterialSubmission",
      required: true,
      unique: true, // one Material per submission
    },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: MATERIAL_CATEGORY_IDS },
    subcategory: { type: String, enum: MATERIAL_SUBCATEGORY_IDS },
    tags: [{ type: String, trim: true, lowercase: true }],
    language: { type: String, default: "English" },

    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: { type: String },
    universityAbbr: { type: String },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    courseCode: { type: String, trim: true },
    courseName: { type: String, trim: true },
    level: { type: String },
    semester: { type: String },
    academicYear: { type: String },

    storageProvider: { type: String, enum: ["cloudinary", "backblaze"], required: true },
    storageKey: { type: String, required: true },
    fileSize: { type: Number, required: true },
    pageCount: { type: Number },

    verificationTier: {
      type: String,
      enum: ["tier1", "tier2"],
      required: true,
      default: "tier1",
    },

    tier1VerifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tier1VerifiedByUpid: { type: String, required: true },
    tier1VerifiedAt: { type: Date, required: true },
    tier1Note: { type: String, maxlength: 1000 },

    tier2VerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tier2VerifiedByUpid: { type: String },
    tier2VerifiedAt: { type: Date },
    tier2Note: { type: String, maxlength: 1000 },

    hasTypedContent: { type: Boolean, default: false },

    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

MaterialSchema.index({ submittedBy: 1, createdAt: -1 });
MaterialSchema.index({ universityId: 1, category: 1, isActive: 1 });
MaterialSchema.index({ departmentId: 1, category: 1, isActive: 1 });
MaterialSchema.index({ courseCode: 1, universityId: 1 });
MaterialSchema.index({ verificationTier: 1, isActive: 1 });
MaterialSchema.index({ category: 1, isActive: 1, createdAt: -1 });
MaterialSchema.index(
  { title: "text", description: "text", tags: "text", courseCode: "text" },
  { name: "material_text" },
);

MaterialSchema.statics.findByDepartment = async function (
  departmentId: string,
  category?: MaterialCategory,
  limit = 20,
) {
  const filter: Record<string, unknown> = { departmentId, isActive: true };
  if (category) filter.category = category;
  return (
    this.find(filter)
      // "tier2" sorts after "tier1", so descending puts endorsed material first
      .sort({ verificationTier: -1, createdAt: -1 })
      .limit(limit)
      .lean()
  );
};

export async function getMaterialModel(): Promise<IMaterialModel> {
  const conn = await connectDB();
  return (
    (conn.models.Material as IMaterialModel | undefined) ??
    conn.model<IMaterial, IMaterialModel>("Material", MaterialSchema)
  );
}
