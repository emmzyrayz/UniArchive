// src/lib/models/bookModel.ts
// A PDF in a user's personal library, or (with `platform` set) a platform
// file: a PDF staff uploaded for UniArchive, waiting in the review queue or
// already published. Platform files never show in anyone's library.
//
// lastOpenedAt lives here only because
// books are owner-only; once books can be shared, per-user reading state
// (lastOpenedAt, current page) should move to a separate ReadingProgress model.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import {
  MATERIAL_CATEGORY_IDS,
  type MaterialCategory,
} from "@/lib/constants/materialCategories";

// Legacy per-book audit fields, kept for existing records. The UniLibrary
// review pipeline lives on MaterialSubmission.
export type MaterialStatus = "pending" | "in_review" | "verified" | "rejected";
export type Visibility = "private" | "shared" | "public";
export type BookProcessingStatus = "none" | "pending" | "done" | "failed";
export type BookStorageProvider = "cloudinary" | "backblaze";

export const PLATFORM_SOURCES = ["mod_upload", "gift"] as const;
export type PlatformSource = (typeof PLATFORM_SOURCES)[number];
export const PLATFORM_STATUSES = ["pending", "published", "discarded"] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];

/** A platform file's place in the staff upload queue. */
export interface IBookPlatform {
  source: PlatformSource;
  status: PlatformStatus;
  // Who uploaded it (staff for mod_upload; recorded, never credited)
  uploadedBy: Types.ObjectId;
  uploadedByUpid: string;
  originalFileName: string;
  originalSize: number; // before browser compression
  // A reviewer working on it holds a short lease so two people don't
  claimedBy?: Types.ObjectId;
  claimedByUpid?: string;
  claimedUntil?: Date;
  // The verify form's unsaved state (validated only when publishing)
  draft?: Record<string, unknown>;
  draftSavedAt?: Date;
  materialId?: Types.ObjectId;
  publishedBy?: Types.ObjectId;
  publishedAt?: Date;
  discardedBy?: Types.ObjectId;
  discardedAt?: Date;
}

export interface IBook {
  title: string;
  description?: string;
  fileUrl: string;
  storageKey: string;
  storageProvider: BookStorageProvider;
  cloudinaryPublicId?: string;
  thumbnailUrl?: string;
  fileSize: number;
  pageCount?: number;
  mimeType: string;
  checksum?: string;
  tags: string[];
  uploaderId: Types.ObjectId;
  ownerUpid: string;
  institutionId?: Types.ObjectId;
  courseCode?: string;
  materialType?: MaterialCategory;
  visibility: Visibility;
  status: MaterialStatus;
  processingStatus: BookProcessingStatus;
  lastOpenedAt?: Date;

  // Optional academic context, pre-filled from the uploader's profile and
  // carried into a UniLibrary submission. Levels use the profile values
  // ("300L"); names are denormalised copies of the refs.
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  level?: string;
  semester?: string;

  // UniLibrary submission (see materialSubmissionModel)
  hasSubmission?: boolean;
  submissionId?: Types.ObjectId;

  // Set only on platform files
  platform?: IBookPlatform;

  createdAt: Date;
  updatedAt: Date;
}

export type BookModel = Model<IBook>;

const BookPlatformSchema = new Schema<IBookPlatform>(
  {
    source: { type: String, enum: PLATFORM_SOURCES, required: true },
    status: { type: String, enum: PLATFORM_STATUSES, required: true, default: "pending" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedByUpid: { type: String, required: true },
    originalFileName: { type: String, required: true, maxlength: 300 },
    originalSize: { type: Number, required: true, min: 0 },
    claimedBy: { type: Schema.Types.ObjectId, ref: "User" },
    claimedByUpid: { type: String },
    claimedUntil: { type: Date },
    draft: { type: Schema.Types.Mixed },
    draftSavedAt: { type: Date },
    materialId: { type: Schema.Types.ObjectId, ref: "Material" },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    discardedBy: { type: Schema.Types.ObjectId, ref: "User" },
    discardedAt: { type: Date },
  },
  { _id: false },
);

/** Matches personal library books only (every query by uploaderId uses it). */
export const LIBRARY_BOOKS = { platform: { $exists: false } } as const;

const BookSchema = new Schema<IBook, BookModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 2000 },
    fileUrl: { type: String, required: true },
    storageKey: { type: String, required: true, unique: true },
    // Books created before Cloudinary support have no provider: they're on B2
    storageProvider: {
      type: String,
      enum: ["cloudinary", "backblaze"],
      required: true,
      default: "backblaze",
    },
    cloudinaryPublicId: { type: String },
    thumbnailUrl: { type: String },
    fileSize: { type: Number, required: true, min: 0 },
    pageCount: { type: Number, min: 0 },
    mimeType: { type: String, default: "application/pdf" },
    checksum: { type: String },
    tags: { type: [String], default: [] },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerUpid: { type: String, required: true, index: true },
    institutionId: { type: Schema.Types.ObjectId, ref: "Institution" },
    courseCode: { type: String, trim: true, uppercase: true },
    materialType: { type: String, enum: MATERIAL_CATEGORY_IDS },
    visibility: {
      type: String,
      enum: ["private", "shared", "public"],
      default: "private",
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "verified", "rejected"],
      default: "pending",
    },
    processingStatus: {
      type: String,
      enum: ["none", "pending", "done", "failed"],
      default: "none",
    },
    lastOpenedAt: { type: Date },

    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: { type: String },
    universityAbbr: { type: String },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    level: { type: String },
    semester: { type: String },

    hasSubmission: { type: Boolean, default: false },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: "MaterialSubmission",
      sparse: true,
    },

    platform: { type: BookPlatformSchema, default: undefined },
  },
  { timestamps: true, collection: "books" },
);

BookSchema.index({ uploaderId: 1, createdAt: -1 });
// The staff upload queue
BookSchema.index(
  { "platform.status": 1, "platform.source": 1, createdAt: 1 },
  { partialFilterExpression: { platform: { $exists: true } } },
);
// Duplicate platform uploads, by SHA-256 of the uploaded file
BookSchema.index(
  { checksum: 1 },
  { partialFilterExpression: { platform: { $exists: true }, checksum: { $exists: true } } },
);

export async function getBookModel(): Promise<BookModel> {
  const conn = await connectDB();
  return (conn.models.Book as BookModel | undefined) ??
    conn.model<IBook, BookModel>("Book", BookSchema);
}
