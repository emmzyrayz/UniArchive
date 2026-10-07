// src/lib/bookCreate.ts
// Creating a Book once the file is stored, shared by every way a PDF comes
// in: browser uploads (POST /api/books, /api/upload/finalize,
// /api/mod/uploads) and Google Drive imports (lib/drive/importFile.ts), so
// they all build the same record.
import type { Types } from "mongoose";
import { getBookModel, type IBook, type PlatformSource } from "@/lib/models/bookModel";
import { storageClient } from "@/lib/storage";
import { newPdfJob } from "@/lib/pdfJobs";
import { upsertUnverifiedFromPlatformBook } from "@/lib/materialPublish";
import { awardBadgesAfter } from "@/lib/badges";
import type { PlatformBookDoc } from "@/lib/platformUploads";

type Owner = { userId: string; upid: string };

/** Where the file is: a Cloudinary upload, or a Backblaze key. */
export type StoredPdf =
  | { provider: "cloudinary"; publicId: string; secureUrl: string }
  | { provider: "backblaze"; key: string };

export interface LibraryBookInput {
  owner: Owner;
  title: string;
  description?: string;
  tags?: string[];
  /** From resolveBookAcademic (lib/submissions.ts) */
  academic?: Partial<Pick<IBook, "universityId" | "universityName" | "universityAbbr" | "facultyId" | "facultyName" | "departmentId" | "departmentName" | "level" | "semester">>;
  stored: StoredPdf;
  fileSize: number;
  mimeType?: string;
  pageCount?: number;
  /** SHA-256 of the file (duplicate checks) */
  checksum?: string;
}

/** A PDF in the owner's personal library; awards upload badges. */
export async function createLibraryBook(input: LibraryBookInput) {
  const Book = await getBookModel();
  const { stored } = input;
  const doc = await Book.create({
    ...input.academic,
    title: input.title,
    description: input.description || undefined,
    tags: input.tags ?? [],
    ...(stored.provider === "cloudinary"
      ? { storageKey: stored.publicId, storageProvider: "cloudinary", cloudinaryPublicId: stored.publicId, fileUrl: stored.secureUrl }
      : {
          storageKey: stored.key,
          storageProvider: "backblaze",
          fileUrl: storageClient.getPublicUrl(stored.key),
          // Page images, so devices that can't run pdf.js can read it (never compressed)
          pdfJob: newPdfJob(false),
        }),
    fileSize: input.fileSize,
    mimeType: input.mimeType ?? "application/pdf",
    pageCount: input.pageCount,
    checksum: input.checksum,
    uploaderId: input.owner.userId,
    ownerUpid: input.owner.upid,
    status: "pending",
    visibility: "private",
  });
  awardBadgesAfter(input.owner.userId, "book_uploaded");
  return doc;
}

export interface PlatformBookInput {
  /** Staff who uploaded it (inbox imports: the admin who connected the inbox) */
  uploader: Owner;
  source: PlatformSource;
  fileName: string;
  storageKey: string;
  fileSize: number;
  /** Size before any browser compression */
  originalSize: number;
  pageCount?: number;
  checksum: string;
  drive?: { fileId: string; sharedByName?: string; sharedByEmail?: string };
}

/** A file in the staff upload queue, listed at once as an unidentified PDF. */
export async function createPlatformBook(input: PlatformBookInput) {
  const Book = await getBookModel();
  const title =
    input.fileName.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim().slice(0, 300) || "Untitled PDF";
  const doc = await Book.create({
    title,
    fileUrl: storageClient.getPublicUrl(input.storageKey),
    storageKey: input.storageKey,
    storageProvider: "backblaze",
    fileSize: input.fileSize,
    pageCount: input.pageCount,
    mimeType: "application/pdf",
    checksum: input.checksum,
    uploaderId: input.uploader.userId,
    ownerUpid: input.uploader.upid,
    status: "pending",
    visibility: "private",
    // Compression and page images by the PDF worker
    pdfJob: newPdfJob(true),
    platform: {
      source: input.source,
      status: "pending",
      uploadedBy: input.uploader.userId,
      uploadedByUpid: input.uploader.upid,
      originalFileName: input.fileName.slice(0, 300),
      originalSize: Math.max(input.originalSize, input.fileSize),
      ...(input.drive && { drive: input.drive }),
    },
  });
  await upsertUnverifiedFromPlatformBook(doc.toObject() as PlatformBookDoc);
  return doc;
}

/** Whether a platform file with this SHA-256 is already queued or published. */
export async function platformDuplicate(checksum: string): Promise<Types.ObjectId | null> {
  const Book = await getBookModel();
  const found = await Book.findOne({ checksum, platform: { $exists: true }, "platform.status": { $ne: "discarded" } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return found?._id ?? null;
}

/** Whether this owner already has a library book with this SHA-256. */
export async function libraryDuplicate(userId: string, checksum: string): Promise<Types.ObjectId | null> {
  const Book = await getBookModel();
  const found = await Book.findOne({ uploaderId: userId, checksum, platform: { $exists: false } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return found?._id ?? null;
}
