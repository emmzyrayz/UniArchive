// src/lib/platformUploads.ts
// Server helpers for the staff upload queue (/api/mod/uploads): storage keys,
// who may work on which file, the claim lease and the response shape.
//
// A platform file is a Book with `platform` set (see bookModel.ts). Staff
// upload it straight to Backblaze, then publish it from the verify workspace
// as a Material credited to UniArchive.
import { NextResponse } from "next/server";
import { isValidObjectId, type Types } from "mongoose";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/types/roles";
import {
  getBookModel,
  type IBook,
  type IBookPlatform,
  type PlatformSource,
  type PlatformStatus,
} from "@/lib/models/bookModel";

/** How long a reviewer's claim on a file lasts without being renewed. */
export const CLAIM_MINUTES = 30;
/** Largest file the queue accepts (same ceiling as library books). */
export const PLATFORM_MAX_FILE_SIZE = 500 * 1024 * 1024;
export const PLATFORM_PRESIGN_SECONDS = 15 * 60;
/** Verify workspace read URLs: long enough for a long review session. */
export const PLATFORM_READ_URL_SECONDS = 4 * 60 * 60;
/** The form state saved with "Save draft" is opaque JSON; keep it small. */
export const MAX_DRAFT_BYTES = 32 * 1024;

const SHA256_HEX = /^[a-f0-9]{64}$/;

export const isSha256 = (value: unknown): value is string =>
  typeof value === "string" && SHA256_HEX.test(value);

function fail(status: number, message: string): never {
  throw NextResponse.json({ message }, { status });
}

// --- Storage keys ---------------------------------------------------------------

/** Every platform object lives under platform/<uploader id>/. */
export function platformKeyPrefix(userId: string): string {
  return `platform/${userId}/`;
}

export function isOwnPlatformKey(storageKey: string, userId: string): boolean {
  return (
    storageKey.startsWith(platformKeyPrefix(userId)) &&
    !storageKey.includes("..") &&
    /^[a-zA-Z0-9/._-]+$/.test(storageKey)
  );
}

// --- Who may do what --------------------------------------------------------------

/**
 * Gifts need "material.review_gifts" (admins). A staff upload can be worked
 * on by whoever uploaded it, and by any admin.
 */
export function canWorkOn(
  session: SessionUser,
  platform: Pick<IBookPlatform, "source" | "uploadedBy">,
): boolean {
  if (platform.source === "gift") return can(session.role, "material.review_gifts");
  return String(platform.uploadedBy) === session.userId || isAdminRole(session.role);
}

export type QueueScope = "mine" | "all" | "gifts";

/** The Mongo filter for a queue tab, or null when the viewer can't see it. */
export function queueFilter(
  session: SessionUser,
  scope: QueueScope,
  status: PlatformStatus,
): Record<string, unknown> | null {
  const base = { "platform.status": status };
  if (scope === "gifts") {
    return can(session.role, "material.review_gifts")
      ? { ...base, "platform.source": "gift" }
      : null;
  }
  if (scope === "all") {
    return isAdminRole(session.role) ? { ...base, "platform.source": "mod_upload" } : null;
  }
  return { ...base, "platform.source": "mod_upload", "platform.uploadedBy": session.userId };
}

export type PlatformBookDoc = IBook & { _id: Types.ObjectId; platform: IBookPlatform };

/**
 * The platform file with this id, when the viewer may work on it. Anything
 * else (bad id, a library book, someone else's upload) is the same 404, so
 * ids can't be probed.
 */
export async function loadPlatformFile(id: string, session: SessionUser): Promise<PlatformBookDoc> {
  if (!isValidObjectId(id)) fail(404, "File not found.");
  const Book = await getBookModel();
  const book = await Book.findOne({ _id: id, platform: { $exists: true } }).lean<PlatformBookDoc>();
  if (!book || !canWorkOn(session, book.platform)) fail(404, "File not found.");
  return book;
}

// --- Claim lease ----------------------------------------------------------------------

/** True while someone other than the viewer holds an unexpired claim. */
export function claimedByOther(platform: IBookPlatform, userId: string, now = new Date()): boolean {
  return (
    !!platform.claimedBy &&
    String(platform.claimedBy) !== userId &&
    !!platform.claimedUntil &&
    platform.claimedUntil.getTime() > now.getTime()
  );
}

/**
 * Takes or renews the viewer's claim, atomically: it only succeeds while the
 * file is pending and nobody else holds a live claim. Returns the new expiry,
 * or null when someone else has it.
 */
export async function takeClaim(bookId: Types.ObjectId, session: SessionUser): Promise<Date | null> {
  const now = new Date();
  const until = new Date(now.getTime() + CLAIM_MINUTES * 60 * 1000);
  const Book = await getBookModel();
  const updated = await Book.findOneAndUpdate(
    {
      _id: bookId,
      "platform.status": "pending",
      $or: [
        { "platform.claimedBy": { $exists: false } },
        { "platform.claimedBy": session.userId },
        { "platform.claimedUntil": { $lte: now } },
      ],
    },
    {
      $set: {
        "platform.claimedBy": session.userId,
        "platform.claimedByUpid": session.upid,
        "platform.claimedUntil": until,
      },
    },
    { projection: { _id: 1 } },
  ).lean();
  return updated ? until : null;
}

// --- Response shape ---------------------------------------------------------------------

export interface PlatformFileDto {
  id: string;
  source: PlatformSource;
  status: PlatformStatus;
  title: string;
  originalFileName: string;
  fileSize: number;
  originalSize: number;
  pageCount?: number;
  uploadedByUpid: string;
  createdAt: string;
  /** Someone's live claim, if any. */
  claim: { byUpid: string; until: string; mine: boolean } | null;
  draftSavedAt?: string;
  materialId?: string;
  publishedAt?: string;
}

export function toPlatformFileDto(book: PlatformBookDoc, viewerId: string, now = new Date()): PlatformFileDto {
  const p = book.platform;
  const live = !!p.claimedBy && !!p.claimedUntil && p.claimedUntil.getTime() > now.getTime();
  return {
    id: String(book._id),
    source: p.source,
    status: p.status,
    title: book.title,
    originalFileName: p.originalFileName,
    fileSize: book.fileSize,
    originalSize: p.originalSize,
    pageCount: book.pageCount,
    uploadedByUpid: p.uploadedByUpid,
    createdAt: new Date(book.createdAt).toISOString(),
    claim: live
      ? {
          byUpid: p.claimedByUpid ?? "",
          until: p.claimedUntil!.toISOString(),
          mine: String(p.claimedBy) === viewerId,
        }
      : null,
    ...(p.draftSavedAt ? { draftSavedAt: new Date(p.draftSavedAt).toISOString() } : {}),
    ...(p.materialId ? { materialId: String(p.materialId) } : {}),
    ...(p.publishedAt ? { publishedAt: new Date(p.publishedAt).toISOString() } : {}),
  };
}
