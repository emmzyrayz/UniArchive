// src/lib/models/materialModel.ts
// A UniLibrary material (Layer 1): one per PDF (Book). It starts
// "unverified" as soon as a student submits a PDF or staff upload one
// (lib/materialPublish.ts), so it is readable at once with an Unverified
// badge; tier-1 verification of its MaterialSubmission (or publishing a
// platform file) makes it "verified". Unidentified platform uploads have no
// submission and no category yet. The file itself stays on the Book; this
// record carries the platform metadata and the verification trail.
//
// Tiers: tier1 (auditor+ checked it is real and relevant, green badge) and
// tier2 (a lecturer+ other than the submitter endorsed it, gold crown).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { ReactionCounts } from "@/lib/constants/reactions";
import {
  MATERIAL_CATEGORY_IDS,
  MATERIAL_SUBCATEGORY_IDS,
  type MaterialCategory,
  type MaterialSubcategory,
} from "@/lib/constants/materialCategories";
import type { MaterialOutline } from "@/lib/outline";

export type { MaterialCategory, MaterialSubcategory };
export type VerificationTier = "tier1" | "tier2";

/**
 * community: a user's submission, credited to them. platform: uploaded by
 * staff (or gifted by a student) and credited to UniArchive, so it never
 * counts toward the uploader's badges, stats or profile.
 */
export const MATERIAL_SOURCES = ["community", "platform"] as const;
export type MaterialSource = (typeof MATERIAL_SOURCES)[number];

export const MATERIAL_STATUSES = ["unverified", "verified"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

/** Verified materials (older ones have no status: they were all verified). */
export const VERIFIED_MATERIALS = { status: { $ne: "unverified" } } as const;

/**
 * What the public UniLibrary shows: active, and not hidden by readers'
 * reports (unverified PDFs with REPORTS_TO_HIDE reports wait for staff).
 */
export const PUBLIC_MATERIALS = { isActive: true, hiddenByReports: { $ne: true } } as const;
export const REPORTS_TO_HIDE = 3;

/**
 * Filter for materials that credit their submitter: verified community
 * ones (older ones have no source). Unverified ones earn nothing yet.
 */
export const COMMUNITY_MATERIALS = { source: { $ne: "platform" }, ...VERIFIED_MATERIALS } as const;

export interface IMaterial {
  _id: Types.ObjectId;

  // Source references
  submissionId?: Types.ObjectId; // ref: MaterialSubmission (none for unidentified platform files)
  bookId: Types.ObjectId; // ref: Book (original upload)
  submittedBy: Types.ObjectId; // ref: User
  submittedByUpid: string;
  source: MaterialSource;
  status: MaterialStatus;

  // Content metadata (same taxonomy as the submission form)
  title: string;
  description: string;
  /** Absent only on unidentified (unverified platform) PDFs */
  category?: MaterialCategory;
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

  // Verification (absent while unverified)
  verificationTier?: VerificationTier;

  // Tier 1 — any auditor+
  tier1VerifiedBy?: Types.ObjectId;
  tier1VerifiedByUpid?: string;
  tier1VerifiedAt?: Date;
  tier1Note?: string;

  // Tier 2 — lecturer+ only, optional, cannot be self-verified
  tier2VerifiedBy?: Types.ObjectId;
  tier2VerifiedByUpid?: string;
  tier2VerifiedAt?: Date;
  tier2Note?: string;

  // Table of contents (textbooks) or course outline (lecture notes); see
  // lib/outline.ts. Absent when nobody has added one.
  outline?: MaterialOutline;

  // Layer 2 typed content (TypedQuestion for past questions,
  // ContentDocument for notes/textbooks) exists for this material
  hasTypedContent: boolean;

  // Engagement
  viewCount: number;
  downloadCount: number;
  reportCount: number;
  // Per-type reaction totals (one Reaction document per user), and their
  // sum for sorting. Both change in the same atomic $inc, so they can't
  // disagree (see POST /api/materials/[id]/react).
  reactions: ReactionCounts;
  reactionCount: number;
  // Comments that aren't deleted (top-level and replies)
  commentCount: number;

  // Visibility (an admin can deactivate a material)
  isActive: boolean;
  /** Unverified and reported by REPORTS_TO_HIDE people: out of the listing until staff look */
  hiddenByReports?: boolean;

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

/** Mongoose `required` for fields only verified materials must have. */
function isVerified(this: { status?: MaterialStatus }): boolean {
  return this.status !== "unverified";
}

const MaterialSchema = new Schema<IMaterial, IMaterialModel>(
  {
    // One Material per submission; unidentified platform files have none
    // (partial unique index below; scripts/backfillUnverifiedMaterials.ts
    // replaces the old plain unique one)
    submissionId: { type: Schema.Types.ObjectId, ref: "MaterialSubmission" },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },
    source: { type: String, enum: MATERIAL_SOURCES, default: "community" },
    status: { type: String, enum: MATERIAL_STATUSES, default: "verified" },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: isVerified, trim: true, default: "" },
    category: { type: String, required: isVerified, enum: MATERIAL_CATEGORY_IDS },
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

    verificationTier: { type: String, enum: ["tier1", "tier2"], required: isVerified },

    tier1VerifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: isVerified },
    tier1VerifiedByUpid: { type: String, required: isVerified },
    tier1VerifiedAt: { type: Date, required: isVerified },
    tier1Note: { type: String, maxlength: 1000 },

    tier2VerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tier2VerifiedByUpid: { type: String },
    tier2VerifiedAt: { type: Date },
    tier2Note: { type: String, maxlength: 1000 },

    outline: {
      type: new Schema(
        {
          kind: { type: String, enum: ["toc", "course_outline"], required: true },
          entries: [
            new Schema(
              {
                title: { type: String, required: true, maxlength: 200 },
                level: { type: Number, enum: [1, 2, 3], required: true },
                page: { type: Number, min: 1 },
                pageLabel: { type: String, maxlength: 20 },
              },
              { _id: false },
            ),
          ],
        },
        { _id: false },
      ),
      default: undefined,
    },

    hasTypedContent: { type: Boolean, default: false },

    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    reactions: {
      helpful: { type: Number, default: 0 },
      excellent: { type: Number, default: 0 },
      accurate: { type: Number, default: 0 },
    },
    reactionCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    hiddenByReports: { type: Boolean },
  },
  { timestamps: true },
);

MaterialSchema.index(
  { submissionId: 1 },
  { name: "submissionId_partial", unique: true, partialFilterExpression: { submissionId: { $type: "objectId" } } },
);
MaterialSchema.index({ status: 1, isActive: 1, createdAt: -1 });
MaterialSchema.index({ submittedBy: 1, createdAt: -1 });
// Read access checks: "is this book published?"
MaterialSchema.index({ bookId: 1, isActive: 1 });
MaterialSchema.index({ universityId: 1, category: 1, isActive: 1 });
MaterialSchema.index({ departmentId: 1, category: 1, isActive: 1 });
MaterialSchema.index({ courseCode: 1, universityId: 1 });
MaterialSchema.index({ verificationTier: 1, isActive: 1 });
MaterialSchema.index({ category: 1, isActive: 1, createdAt: -1 });
// "popular" sort and the trending candidate set
MaterialSchema.index({ isActive: 1, viewCount: -1, createdAt: -1 });
// Outline titles are searchable too. Changing this index needs a one-off
// rebuild of the existing one: scripts/rebuildMaterialTextIndex.ts
MaterialSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
    courseCode: "text",
    "outline.entries.title": "text",
  },
  { name: "material_text_v2" },
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
