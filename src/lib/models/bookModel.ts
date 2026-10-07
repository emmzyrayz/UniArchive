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

// drive: staff Drive import; drive_inbox: shared with the UniArchive Gmail
export const PLATFORM_SOURCES = ["mod_upload", "gift", "drive", "drive_inbox"] as const;
export type PlatformSource = (typeof PLATFORM_SOURCES)[number];
export const PLATFORM_STATUSES = ["pending", "published", "discarded"] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];

/**
 * Background processing by the PDF worker (services/pdf-worker): page images
 * for every Backblaze PDF, so devices that can't run pdf.js can still read
 * it, plus lossy compression for platform files only. See lib/pdfJobs.ts.
 */
export interface IPdfJob {
  status: "queued" | "processing" | "done" | "failed";
  compress: boolean;
  attempts: number;
  queuedAt: Date;
  leaseUntil?: Date;
  finishedAt?: Date;
  error?: string;
  // Set when compression replaced the file
  originalSize?: number;
  compressedSize?: number;
}

/** Page images in B2 at pages/<bookId>/<n>.webp, written by the worker. */
export interface IPageImages {
  count: number;
  width: number;
  createdAt: Date;
}

/** What a student said about a PDF they gifted, and where they study. */
export interface IGiftDetails {
  note: string;
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  level?: string; // profile style, "300L"
  semester?: string;
}

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
  // Gifts only: the student's note and academic details (prefill the verify
  // form), and the library book it was copied from
  gift?: IGiftDetails;
  sourceBookId?: Types.ObjectId;
  // Drive imports: the Drive file, and (inbox) who shared it (email encrypted)
  drive?: { fileId: string; sharedByName?: string; sharedByEmail?: string };
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

  // Library books only: when the owner gifted a copy to UniArchive (it can't
  // then be submitted for credit or gifted again)
  giftedAt?: Date;

  // Backblaze PDFs only
  pdfJob?: IPdfJob;
  pageImages?: IPageImages;

  createdAt: Date;
  updatedAt: Date;
}

export type BookModel = Model<IBook>;

const PdfJobSchema = new Schema<IPdfJob>(
  {
    status: { type: String, enum: ["queued", "processing", "done", "failed"], required: true },
    compress: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    queuedAt: { type: Date, required: true },
    leaseUntil: { type: Date },
    finishedAt: { type: Date },
    error: { type: String, maxlength: 500 },
    originalSize: { type: Number },
    compressedSize: { type: Number },
  },
  { _id: false },
);

const PageImagesSchema = new Schema<IPageImages>(
  {
    count: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const GiftDetailsSchema = new Schema<IGiftDetails>(
  {
    note: { type: String, required: true, maxlength: 1000 },
    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: { type: String },
    universityAbbr: { type: String },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    level: { type: String },
    semester: { type: String },
  },
  { _id: false },
);

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
    gift: { type: GiftDetailsSchema, default: undefined },
    sourceBookId: { type: Schema.Types.ObjectId, ref: "Book" },
    drive: {
      type: new Schema(
        { fileId: { type: String, required: true }, sharedByName: String, sharedByEmail: String },
        { _id: false },
      ),
      default: undefined,
    },
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
    giftedAt: { type: Date },
    pdfJob: { type: PdfJobSchema, default: undefined },
    pageImages: { type: PageImagesSchema, default: undefined },
  },
  { timestamps: true, collection: "books" },
);

BookSchema.index({ uploaderId: 1, createdAt: -1 });
// The staff upload queue
BookSchema.index(
  { "platform.status": 1, "platform.source": 1, createdAt: 1 },
  { partialFilterExpression: { platform: { $exists: true } } },
);
// The worker's job queue (oldest first)
BookSchema.index(
  { "pdfJob.status": 1, "pdfJob.queuedAt": 1 },
  { partialFilterExpression: { pdfJob: { $exists: true } } },
);
// One gift per library book
BookSchema.index(
  { "platform.sourceBookId": 1 },
  { unique: true, partialFilterExpression: { "platform.sourceBookId": { $exists: true } } },
);
// Duplicate library books per owner (Drive imports), by SHA-256. Partial
// indexes can't say "platform doesn't exist", so platform books with a
// checksum are in it too (the query adds that condition).
BookSchema.index(
  { uploaderId: 1, checksum: 1 },
  { partialFilterExpression: { checksum: { $exists: true } } },
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
