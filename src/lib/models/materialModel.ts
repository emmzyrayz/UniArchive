// src/lib/models/materialModel.ts
// One "materials" collection with a `kind` discriminator (pdf, text, image,
// video) and the audit pipeline: pending -> in_review -> verified | rejected.
//
// Differences from the old model: comments, ratings and per-view analytics
// are no longer embedded (unbounded arrays), category/subcategory are now
// persisted, and every reviewer is a User ObjectId.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { roleHierarchy, type UserRole } from "@/types/roles";
import {
  CONTENT_BLOCK_TYPES,
  type ContentBlock,
} from "@/types/content";
import {
  MATERIAL_CATEGORY_IDS,
  MATERIAL_SUBCATEGORY_IDS,
  type MaterialCategory,
  type MaterialSubcategory,
} from "@/lib/constants/materialCategories";

const USER_ROLES = Object.keys(roleHierarchy) as UserRole[];

export type MaterialKind = "pdf" | "text" | "image" | "video";
export type MaterialType = "PDF" | "TEXT" | "IMAGE" | "VIDEO";
export type MaterialStatus = "pending" | "in_review" | "verified" | "rejected";
export type Visibility = "private" | "shared" | "public";
export type ProcessingStatus =
  | "none"
  | "pending"
  | "processing"
  | "done"
  | "failed";
export type ApprovalAction =
  | "submitted"
  | "audited"
  | "verified"
  | "rejected"
  | "resubmitted";

const KIND_TO_TYPE: Record<MaterialKind, MaterialType> = {
  pdf: "PDF",
  text: "TEXT",
  image: "IMAGE",
  video: "VIDEO",
};

export interface IApprovalRecord {
  actionType: ApprovalAction;
  performedBy: Types.ObjectId;
  performedByName: string;
  performedByRole: UserRole;
  timestamp: Date;
  notes?: string;
  reason?: string;
}

export interface IEditRecord {
  changedFields: string[];
  previousVersion: number;
  editedBy: Types.ObjectId;
  editedByName?: string;
  editedByRole?: UserRole;
  editedAt: Date;
  reason?: string;
}

export interface IMaterial {
  kind: MaterialKind;
  materialType: MaterialType;

  // Uploader (always taken from the session, never from the request body)
  uploaderId: Types.ObjectId;
  uploaderUpid: string;
  uploaderName?: string;
  uploaderRole: UserRole;

  // Placement
  institutionId?: Types.ObjectId;
  courseId?: string;
  courseName?: string;
  schoolName?: string;
  facultyName?: string;
  departmentName?: string;

  // Metadata
  materialTitle: string;
  materialDescription?: string;
  category?: MaterialCategory;
  subcategory?: MaterialSubcategory;
  topic?: string;
  tableOfContent: string[];
  tags: string[];
  keywords: string[];

  // File
  fileSize?: number;
  format?: string;
  originalFileName?: string;
  materialUrl?: string;
  storageKey?: string;
  mimeType?: string;
  checksum?: string;
  processingStatus: ProcessingStatus;
  ocrText?: string;

  // Visibility and audit pipeline
  visibility: Visibility;
  status: MaterialStatus;
  auditedBy?: Types.ObjectId;
  auditedAt?: Date;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  approvalHistory: IApprovalRecord[];

  // Versioning
  version: number;
  editHistory: IEditRecord[];

  // Counters (replacing the old embedded analytics arrays)
  viewCount: number;
  downloadCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPdfMaterial extends IMaterial {
  kind: "pdf";
  pageCount?: number;
  thumbnailUrl?: string;
  isSearchable: boolean;
}

export interface ITextMaterial extends IMaterial {
  kind: "text";
  contentBlocks: ContentBlock[];
}

export interface IImageMaterial extends IMaterial {
  kind: "image";
  imageUrls: string[];
  storageKeys: string[];
  thumbnailUrls: string[];
  dimensions: { width: number; height: number }[];
}

export interface IVideoMaterial extends IMaterial {
  kind: "video";
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  subtitleUrls: string[];
}

/** The person performing a review or edit, resolved from their session. */
export interface MaterialActor {
  userId: Types.ObjectId | string;
  name: string;
  role: UserRole;
}

interface MaterialStatics {
  addApprovalRecord(
    materialId: string,
    record: Omit<IApprovalRecord, "timestamp" | "performedBy"> & {
      performedBy: Types.ObjectId | string;
    },
  ): Promise<IMaterial | null>;
  auditMaterial(
    materialId: string,
    auditor: MaterialActor,
    notes?: string,
  ): Promise<IMaterial | null>;
  approveMaterial(
    materialId: string,
    verifier: MaterialActor,
    notes?: string,
  ): Promise<IMaterial | null>;
  rejectMaterial(
    materialId: string,
    reviewer: MaterialActor,
    reason: string,
    notes?: string,
  ): Promise<IMaterial | null>;
  addEditRecord(
    materialId: string,
    editor: MaterialActor,
    changedFields: string[],
    reason?: string,
  ): Promise<IMaterial | null>;
  getMaterialsPendingApproval(
    limit?: number,
    statuses?: MaterialStatus[],
  ): Promise<IMaterial[]>;
}

export type MaterialModel = Model<IMaterial> & MaterialStatics;

const ApprovalRecordSchema = new Schema<IApprovalRecord>(
  {
    actionType: {
      type: String,
      enum: ["submitted", "audited", "verified", "rejected", "resubmitted"],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, required: true },
    performedByRole: { type: String, enum: USER_ROLES, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 2000 },
    reason: { type: String, maxlength: 2000 },
  },
  { _id: false },
);

const EditRecordSchema = new Schema<IEditRecord>(
  {
    changedFields: { type: [String], default: [] },
    previousVersion: { type: Number, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    editedByName: { type: String },
    editedByRole: { type: String, enum: USER_ROLES },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, maxlength: 2000 },
  },
  { _id: false },
);

const MaterialSchema = new Schema<IMaterial, MaterialModel>(
  {
    materialType: {
      type: String,
      enum: ["PDF", "TEXT", "IMAGE", "VIDEO"],
      required: true,
      index: true,
    },

    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploaderUpid: { type: String, required: true, index: true },
    uploaderName: { type: String },
    uploaderRole: { type: String, enum: USER_ROLES, required: true },

    institutionId: { type: Schema.Types.ObjectId, ref: "Institution" },
    courseId: { type: String, index: true },
    courseName: { type: String },
    schoolName: { type: String },
    facultyName: { type: String },
    departmentName: { type: String },

    materialTitle: { type: String, required: true, trim: true, maxlength: 300 },
    materialDescription: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, enum: MATERIAL_CATEGORY_IDS, index: true },
    subcategory: { type: String, enum: MATERIAL_SUBCATEGORY_IDS },
    topic: { type: String, trim: true },
    tableOfContent: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    keywords: { type: [String], default: [] },

    fileSize: { type: Number, min: 0 },
    format: { type: String },
    originalFileName: { type: String },
    materialUrl: { type: String },
    storageKey: { type: String },
    mimeType: { type: String },
    checksum: { type: String },
    processingStatus: {
      type: String,
      enum: ["none", "pending", "processing", "done", "failed"],
      default: "none",
    },
    ocrText: { type: String },

    visibility: {
      type: String,
      enum: ["private", "shared", "public"],
      default: "private",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    auditedBy: { type: Schema.Types.ObjectId, ref: "User" },
    auditedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 2000 },
    approvalHistory: { type: [ApprovalRecordSchema], default: [] },

    version: { type: Number, default: 1 },
    editHistory: { type: [EditRecordSchema], default: [] },

    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "materials",
    discriminatorKey: "kind",
  },
);

MaterialSchema.index({ courseId: 1, materialType: 1, status: 1 });
MaterialSchema.index({ uploaderId: 1, createdAt: -1 });
MaterialSchema.index({ status: 1, createdAt: 1 });
MaterialSchema.index({ tags: 1, visibility: 1 });

// Keep the legacy materialType field in step with the discriminator.
MaterialSchema.pre("validate", function () {
  if (this.kind) this.materialType = KIND_TO_TYPE[this.kind];
});

MaterialSchema.static(
  "addApprovalRecord",
  function (
    this: MaterialModel,
    materialId: string,
    record: Omit<IApprovalRecord, "timestamp" | "performedBy"> & {
      performedBy: Types.ObjectId | string;
    },
  ) {
    return this.findByIdAndUpdate(
      materialId,
      { $push: { approvalHistory: { ...record, timestamp: new Date() } } },
      { returnDocument: "after" },
    ).lean();
  },
);

// pending -> in_review
MaterialSchema.static(
  "auditMaterial",
  function (
    this: MaterialModel,
    materialId: string,
    auditor: MaterialActor,
    notes?: string,
  ) {
    const now = new Date();
    return this.findOneAndUpdate(
      { _id: materialId, status: "pending" },
      {
        $set: { status: "in_review", auditedBy: auditor.userId, auditedAt: now },
        $push: {
          approvalHistory: {
            actionType: "audited",
            performedBy: auditor.userId,
            performedByName: auditor.name,
            performedByRole: auditor.role,
            timestamp: now,
            notes,
          },
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
);

// pending | in_review -> verified
MaterialSchema.static(
  "approveMaterial",
  function (
    this: MaterialModel,
    materialId: string,
    verifier: MaterialActor,
    notes?: string,
  ) {
    const now = new Date();
    return this.findOneAndUpdate(
      { _id: materialId, status: { $in: ["pending", "in_review"] } },
      {
        $set: {
          status: "verified",
          verifiedBy: verifier.userId,
          verifiedAt: now,
        },
        $unset: { rejectionReason: 1, rejectedBy: 1, rejectedAt: 1 },
        $push: {
          approvalHistory: {
            actionType: "verified",
            performedBy: verifier.userId,
            performedByName: verifier.name,
            performedByRole: verifier.role,
            timestamp: now,
            notes,
          },
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
);

// pending | in_review -> rejected
MaterialSchema.static(
  "rejectMaterial",
  function (
    this: MaterialModel,
    materialId: string,
    reviewer: MaterialActor,
    reason: string,
    notes?: string,
  ) {
    const now = new Date();
    return this.findOneAndUpdate(
      { _id: materialId, status: { $in: ["pending", "in_review"] } },
      {
        $set: {
          status: "rejected",
          rejectedBy: reviewer.userId,
          rejectedAt: now,
          rejectionReason: reason,
        },
        $push: {
          approvalHistory: {
            actionType: "rejected",
            performedBy: reviewer.userId,
            performedByName: reviewer.name,
            performedByRole: reviewer.role,
            timestamp: now,
            reason,
            notes,
          },
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
);

// Bumps the version. The update only applies if nobody else edited the
// document in between (optimistic concurrency on `version`).
MaterialSchema.static(
  "addEditRecord",
  async function (
    this: MaterialModel,
    materialId: string,
    editor: MaterialActor,
    changedFields: string[],
    reason?: string,
  ) {
    const current = await this.findById(materialId).select("version").lean();
    if (!current) return null;
    const previousVersion = current.version ?? 1;
    return this.findOneAndUpdate(
      { _id: materialId, version: previousVersion },
      {
        $inc: { version: 1 },
        $push: {
          editHistory: {
            changedFields,
            previousVersion,
            editedBy: editor.userId,
            editedByName: editor.name,
            editedByRole: editor.role,
            editedAt: new Date(),
            reason,
          },
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
);

MaterialSchema.static(
  "getMaterialsPendingApproval",
  function (
    this: MaterialModel,
    limit = 50,
    statuses: MaterialStatus[] = ["pending", "in_review"],
  ) {
    return this.find({ status: { $in: statuses } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  },
);

const PdfSchema = new Schema<IPdfMaterial>({
  pageCount: { type: Number, min: 0 },
  thumbnailUrl: { type: String },
  isSearchable: { type: Boolean, default: false },
});

const ContentBlockSchema = new Schema<ContentBlock>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: CONTENT_BLOCK_TYPES, required: true },
    content: { type: String, default: "" },
    description: { type: String },
    imageDescription: { type: String },
  },
  { _id: false },
);

const TextSchema = new Schema<ITextMaterial>({
  contentBlocks: { type: [ContentBlockSchema], default: [] },
});

const ImageSchema = new Schema<IImageMaterial>({
  imageUrls: { type: [String], default: [] },
  storageKeys: { type: [String], default: [] },
  thumbnailUrls: { type: [String], default: [] },
  dimensions: {
    type: [{ width: Number, height: Number, _id: false }],
    default: [],
  },
});

const VideoSchema = new Schema<IVideoMaterial>({
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  duration: { type: Number, min: 0 },
  resolution: { type: String },
  subtitleUrls: { type: [String], default: [] },
});

export interface MaterialModels {
  Material: MaterialModel;
  PdfMaterial: Model<IPdfMaterial>;
  TextMaterial: Model<ITextMaterial>;
  ImageMaterial: Model<IImageMaterial>;
  VideoMaterial: Model<IVideoMaterial>;
}

export async function getMaterialModels(): Promise<MaterialModels> {
  const conn = await connectDB();
  const Material =
    (conn.models.Material as MaterialModel | undefined) ??
    conn.model<IMaterial, MaterialModel>("Material", MaterialSchema);

  // Discriminators are registered once per process; reuse them after hot reloads.
  const existing = Material.discriminators ?? {};
  const PdfMaterial =
    (existing.PdfMaterial as Model<IPdfMaterial> | undefined) ??
    Material.discriminator<IPdfMaterial>("PdfMaterial", PdfSchema, "pdf");
  const TextMaterial =
    (existing.TextMaterial as Model<ITextMaterial> | undefined) ??
    Material.discriminator<ITextMaterial>("TextMaterial", TextSchema, "text");
  const ImageMaterial =
    (existing.ImageMaterial as Model<IImageMaterial> | undefined) ??
    Material.discriminator<IImageMaterial>("ImageMaterial", ImageSchema, "image");
  const VideoMaterial =
    (existing.VideoMaterial as Model<IVideoMaterial> | undefined) ??
    Material.discriminator<IVideoMaterial>("VideoMaterial", VideoSchema, "video");

  return { Material, PdfMaterial, TextMaterial, ImageMaterial, VideoMaterial };
}

export async function getMaterialModel(): Promise<MaterialModel> {
  return (await getMaterialModels()).Material;
}
