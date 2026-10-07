// src/lib/drive/importFile.ts
// Imports one Google Drive file into UniArchive, the same way for every
// source: a public link, the Picker (a person's own token) or the platform
// inbox. Server to server, so the importer's data is spent only choosing.
//
//  1. Drive details: must be a PDF of at most 500 MB.
//  2. Ledger (DriveImport): the same Drive file (same md5) already imported
//     for this owner, and its book still there? Skip without downloading.
//  3. Download, check it starts with %PDF-, hash it (SHA-256).
//     Up to BUFFER_MAX_BYTES it's read into memory (page count with
//     pdf-lib); bigger files stream straight to Backblaze in parts.
//  4. Duplicate by SHA-256: the owner's library, or the platform queue.
//  5. Store (library: Cloudinary up to 10 MB, else Backblaze; platform:
//     Backblaze) and create the Book with lib/bookCreate.ts.
// Every attempt leaves a DriveImport row.
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { PDFDocument } from "pdf-lib";
import { Types } from "mongoose";
import { download, getMeta, isPdf, DriveError, type DriveAuth, type DriveFile } from "@/lib/drive/api";
import { getDriveImportModel, type IDriveImport } from "@/lib/models/driveImportModel";
import { getBookModel } from "@/lib/models/bookModel";
import { getUserModel } from "@/lib/models/userModel";
import { storageClient } from "@/lib/storage";
import { uploadPdfFromServer } from "@/lib/cloudinary";
import { CLOUDINARY_MAX_SIZE } from "@/lib/storageRouter";
import { BOOK_MAX_FILE_SIZE, bookKeyPrefix, cloudinaryBookPrefix } from "@/lib/uploads";
import { platformKeyPrefix } from "@/lib/platformUploads";
import { resolveBookAcademic } from "@/lib/submissions";
import { encryptSensitiveData } from "@/lib/encryption";
import { createLibraryBook, createPlatformBook, libraryDuplicate, platformDuplicate } from "@/lib/bookCreate";

/** Files up to this size are handled in memory (and get a page count). */
export const BUFFER_MAX_BYTES = 50 * 1024 * 1024;

type Person = { userId: string; upid: string };

export type ImportTarget =
  | { kind: "library"; owner: Person }
  | { kind: "platform"; uploader: Person; source: "drive" | "drive_inbox"; sharedBy?: { name?: string; email?: string } };

export interface DriveImportResult {
  status: "imported" | "duplicate" | "failed";
  name: string;
  message?: string;
  bookId?: string;
  duplicateOf?: string;
}

class ImportFailure extends Error {}

const ownerKey = (t: ImportTarget) => (t.kind === "library" ? t.owner.userId : "platform");
const person = (t: ImportTarget) => (t.kind === "library" ? t.owner : t.uploader);

/** Where a stored file goes: a unique key per file, under the owner's prefix. */
function storageKeyFor(target: ImportTarget, name: string): string {
  const fileName = storageClient.generateUniqueFileName(/\.pdf$/i.test(name) ? name : `${name}.pdf`);
  if (target.kind === "library") return bookKeyPrefix(target.owner.userId) + fileName;
  return target.source === "drive_inbox" ? `platform/inbox/${fileName}` : platformKeyPrefix(target.uploader.userId) + fileName;
}

/** The book an earlier import of this Drive file made, if it's still there. */
async function alreadyImported(target: ImportTarget, file: DriveFile): Promise<Types.ObjectId | null> {
  const DriveImport = await getDriveImportModel();
  const rows = await DriveImport.find({
    owner: ownerKey(target),
    driveFileId: file.id,
    status: { $in: ["imported", "duplicate"] },
    ...(file.md5Checksum && { md5: file.md5Checksum }),
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("bookId duplicateOf")
    .lean<Pick<IDriveImport, "bookId" | "duplicateOf">[]>();
  const ids = rows.map((r) => r.bookId ?? r.duplicateOf).filter((id): id is Types.ObjectId => !!id);
  if (ids.length === 0) return null;
  const Book = await getBookModel();
  const live = await Book.findOne({
    _id: { $in: ids },
    ...(target.kind === "platform" ? { "platform.status": { $ne: "discarded" } } : {}),
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return live?._id ?? null;
}

/** The library owner's profile school, department and level, for the new book. */
async function profileAcademic(userId: string) {
  const User = await getUserModel();
  const u = await User.findById(userId)
    .select("universityId facultyId departmentId level")
    .lean<{ universityId?: Types.ObjectId; facultyId?: Types.ObjectId; departmentId?: Types.ObjectId; level?: string }>();
  try {
    return await resolveBookAcademic({
      universityId: u?.universityId ? String(u.universityId) : undefined,
      facultyId: u?.facultyId ? String(u.facultyId) : undefined,
      departmentId: u?.departmentId ? String(u.departmentId) : undefined,
      level: u?.level,
    });
  } catch {
    // A stale profile reference: import without academic details
    return {};
  }
}

async function readAll(body: ReadableStream<Uint8Array>, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of Readable.fromWeb(body as WebReadableStream<Uint8Array>)) {
    total += (chunk as Buffer).length;
    if (total > limit) throw new ImportFailure(`It's bigger than ${Math.round(limit / 1024 / 1024)} MB.`);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks, total);
}

async function countPages(bytes: Uint8Array): Promise<number | undefined> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return undefined;
  }
}

const isPdfBytes = (head: Uint8Array) => Buffer.from(head.subarray(0, 5)).toString("latin1") === "%PDF-";

/** Streams a large download to Backblaze, hashing on the way. */
async function streamToStorage(body: ReadableStream<Uint8Array>, key: string) {
  const hash = crypto.createHash("sha256");
  let size = 0;
  let head = Buffer.alloc(0);
  // Sees every chunk on its way to the upload (one reader, no races)
  const tap = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      size += chunk.length;
      if (head.length < 5) head = Buffer.concat([head, chunk]).subarray(0, 5);
      callback(null, chunk);
    },
  });
  const source = Readable.fromWeb(body as WebReadableStream<Uint8Array>);
  source.on("error", (error) => tap.destroy(error));
  const result = await storageClient.uploadStream(source.pipe(tap), key);
  if (!result.success) throw new ImportFailure("Couldn't store it. Try again in a moment.");
  return { checksum: hash.digest("hex"), size, isPdf: isPdfBytes(head) };
}

/** Imports one Drive file. Never throws for a problem with the file itself. */
export async function importDriveFile(
  target: ImportTarget,
  ref: { fileId: string; resourceKey?: string },
  auth: DriveAuth,
  via: IDriveImport["via"],
  options: { known?: DriveFile } = {},
): Promise<DriveImportResult> {
  const DriveImport = await getDriveImportModel();
  const who = person(target);
  let file: DriveFile | undefined = options.known;
  const record = async (result: DriveImportResult) => {
    await DriveImport.create({
      owner: ownerKey(target),
      target: target.kind,
      via,
      importedBy: new Types.ObjectId(who.userId),
      driveFileId: file?.id ?? ref.fileId,
      md5: file?.md5Checksum,
      name: (file?.name ?? result.name).slice(0, 500),
      size: file?.size,
      status: result.status,
      message: result.message?.slice(0, 500),
      bookId: result.bookId ? new Types.ObjectId(result.bookId) : undefined,
      duplicateOf: result.duplicateOf ? new Types.ObjectId(result.duplicateOf) : undefined,
      ...(target.kind === "platform" &&
        target.sharedBy && {
          sharedByName: target.sharedBy.name?.slice(0, 200),
          sharedByEmail: target.sharedBy.email ? encryptSensitiveData(target.sharedBy.email.toLowerCase()) : undefined,
        }),
    });
    return result;
  };

  let storedKey: string | null = null;
  try {
    file ??= await getMeta(ref.fileId, auth, ref.resourceKey);
    const name = file.name || "Untitled.pdf";
    if (!isPdf(file)) throw new ImportFailure("It isn't a PDF.");
    if (file.size !== undefined && file.size > BOOK_MAX_FILE_SIZE) {
      throw new ImportFailure(`It's bigger than ${BOOK_MAX_FILE_SIZE / 1024 / 1024} MB.`);
    }

    const earlier = await alreadyImported(target, file);
    if (earlier) {
      return record({ status: "duplicate", name, message: "Already imported.", duplicateOf: String(earlier) });
    }

    const res = await download(file.id, auth, ref.resourceKey ?? file.resourceKey);
    if (!res.body) throw new ImportFailure("Google Drive sent an empty file.");
    const findDuplicate = (checksum: string) =>
      target.kind === "library" ? libraryDuplicate(target.owner.userId, checksum) : platformDuplicate(checksum);

    let checksum: string;
    let size: number;
    let pageCount: number | undefined;
    let bytes: Buffer | null = null;
    const key = storageKeyFor(target, name);

    if (file.size !== undefined && file.size <= BUFFER_MAX_BYTES) {
      bytes = await readAll(res.body, BUFFER_MAX_BYTES);
      if (!isPdfBytes(bytes)) throw new ImportFailure("It isn't a PDF (the file's contents don't match).");
      checksum = crypto.createHash("sha256").update(bytes).digest("hex");
      size = bytes.length;
      const dup = await findDuplicate(checksum);
      if (dup) return record({ status: "duplicate", name, message: "You already have this PDF.", duplicateOf: String(dup) });
      pageCount = await countPages(bytes);
    } else {
      // Large (or of unknown size): straight to Backblaze, checked afterwards
      storedKey = key;
      const streamed = await streamToStorage(res.body, key);
      ({ checksum, size } = streamed);
      if (!streamed.isPdf) throw new ImportFailure("It isn't a PDF (the file's contents don't match).");
      if (size > BOOK_MAX_FILE_SIZE) throw new ImportFailure(`It's bigger than ${BOOK_MAX_FILE_SIZE / 1024 / 1024} MB.`);
      const dup = await findDuplicate(checksum);
      if (dup) {
        await storageClient.deleteFile(key).catch(() => undefined);
        storedKey = null;
        return record({ status: "duplicate", name, message: "You already have this PDF.", duplicateOf: String(dup) });
      }
    }

    let bookId: string;
    if (target.kind === "library") {
      const title = name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim().slice(0, 300) || "Untitled PDF";
      const academic = await profileAcademic(target.owner.userId);
      // Small files to Cloudinary (page images for old phones), like uploads;
      // if Cloudinary refuses it (quota, outage), Backblaze instead
      const publicId =
        cloudinaryBookPrefix(target.owner.userId) +
        key.slice(key.lastIndexOf("/") + 1).replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const uploaded =
        bytes && size <= CLOUDINARY_MAX_SIZE
          ? await uploadPdfFromServer(bytes, publicId).catch((error) => {
              console.error("[drive] Cloudinary upload failed, using Backblaze:", error);
              return null;
            })
          : null;
      if (uploaded) {
        const doc = await createLibraryBook({
          owner: target.owner,
          title,
          academic,
          stored: { provider: "cloudinary", publicId: uploaded.publicId, secureUrl: uploaded.secureUrl },
          fileSize: size,
          pageCount: uploaded.pageCount || pageCount,
          checksum,
        });
        bookId = String(doc._id);
      } else {
        if (bytes) {
          const put = await storageClient.uploadFile(bytes, key, "application/pdf");
          if (!put.success) throw new ImportFailure("Couldn't store it. Try again in a moment.");
          storedKey = key;
        }
        const doc = await createLibraryBook({
          owner: target.owner,
          title,
          academic,
          stored: { provider: "backblaze", key },
          fileSize: size,
          pageCount,
          checksum,
        });
        bookId = String(doc._id);
      }
    } else {
      if (bytes) {
        const put = await storageClient.uploadFile(bytes, key, "application/pdf");
        if (!put.success) throw new ImportFailure("Couldn't store it. Try again in a moment.");
        storedKey = key;
      }
      const doc = await createPlatformBook({
        uploader: target.uploader,
        source: target.source,
        fileName: name,
        storageKey: key,
        fileSize: size,
        originalSize: size,
        pageCount,
        checksum,
        drive: {
          fileId: file.id,
          ...(target.sharedBy?.name && { sharedByName: target.sharedBy.name.slice(0, 200) }),
          ...(target.sharedBy?.email && { sharedByEmail: encryptSensitiveData(target.sharedBy.email.toLowerCase()) }),
        },
      });
      bookId = String(doc._id);
    }
    storedKey = null; // the book owns it now
    return record({ status: "imported", name, bookId });
  } catch (error) {
    if (storedKey) await storageClient.deleteFile(storedKey).catch(() => undefined);
    const message =
      error instanceof ImportFailure || error instanceof DriveError
        ? error.message
        : "Something went wrong importing it. Try again.";
    if (!(error instanceof ImportFailure || error instanceof DriveError)) {
      console.error(`[drive] import of ${ref.fileId} failed:`, error);
    }
    return record({ status: "failed", name: file?.name ?? "Unknown file", message });
  }
}
