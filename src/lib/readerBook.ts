// src/lib/readerBook.ts
// Opening a book in the reader: access check, a signed URL for the private
// file, the bookkeeping (owner's lastOpenedAt, a non-owner's download count)
// and the published material's outline. Shared by GET /api/books/[id] and
// the /read/[id] layout, which calls it directly: it used to fetch its own
// API over HTTP through NEXT_PUBLIC_APP_URL with the cookies copied over,
// and any redirect on the way (another host, e.g. *.vercel.app -> the
// custom domain) dropped the cookies, so signed-in readers were sent to
// sign in again in a loop.
import { after } from "next/server";
import { getBookModel } from "@/lib/models/bookModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { redis } from "@/lib/redis";
import { storageClient } from "@/lib/storage";
import { getCloudinaryPdfUrl } from "@/lib/cloudinary";
import { toBookDto, type BookDoc } from "@/lib/dto/book";
import { findReadableBook } from "@/lib/bookAccess";
import type { SessionUser } from "@/lib/auth/session";
import type { MaterialOutline } from "@/lib/outline";

// Long enough for a reading session: pdf.js keeps making range requests
// against the same URL as the reader scrolls.
const READ_URL_TTL_SECONDS = 4 * 60 * 60;
// A reader counts as one download per material per day
const DOWNLOAD_DEDUPE_SECONDS = 24 * 60 * 60;

const isCloudinary = (book: BookDoc) => book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;

async function signedReadUrl(book: BookDoc): Promise<string | null> {
  if (isCloudinary(book)) {
    try {
      return getCloudinaryPdfUrl(book.cloudinaryPublicId!);
    } catch (error) {
      console.error("[reader] failed to sign Cloudinary URL:", error);
      return null;
    }
  }
  const signed = await storageClient.generatePresignedDownloadUrl(book.storageKey, READ_URL_TTL_SECONDS);
  if (!signed.success || !signed.downloadUrl) {
    console.error("[reader] failed to sign download URL:", signed.error);
    return null;
  }
  return signed.downloadUrl;
}

export type ReaderBook = ReturnType<typeof toBookDto> & { fileUrl: string; outline: MaterialOutline | null };

export type OpenBookResult =
  | { kind: "ok"; book: ReaderBook }
  // Missing, or not this user's to read (indistinguishable on purpose)
  | { kind: "not_found" }
  | { kind: "storage_unavailable" };

/** Opens a book for `session`'s reader. */
export async function openBookForReader(id: string, session: SessionUser): Promise<OpenBookResult> {
  const found = await findReadableBook(id, session);
  if (!found) return { kind: "not_found" };

  // Storage is private, so the stored URL can't be read by the browser
  const fileUrl = await signedReadUrl(found.book);
  if (!fileUrl) return { kind: "storage_unavailable" };

  // Fire-and-forget: a failed bookkeeping write must never block or break
  // the read. timestamps: false so opening a book doesn't bump updatedAt.
  // A reviewer opening it isn't the owner's reading activity.
  if (found.isOwner) {
    (await getBookModel())
      .updateOne({ _id: found.book._id }, { $set: { lastOpenedAt: new Date() } }, { timestamps: false })
      .exec()
      .catch((error) => console.error("[reader] failed to update lastOpenedAt:", error));
  }

  // A non-owner opening a published UniLibrary material counts as a
  // download (the reader now holds the file). Once per reader per material
  // per day, so reloads and the reader's own refetches don't inflate it.
  const materialId = found.isOwner ? undefined : found.publishedMaterialId;
  if (materialId) {
    const readerId = session.userId;
    after(async () => {
      try {
        const first = await redis.set(`download:${materialId}:${readerId}`, "1", {
          nx: true,
          ex: DOWNLOAD_DEDUPE_SECONDS,
        });
        if (!first) return;
        await (await getMaterialModel()).updateOne(
          { _id: materialId },
          { $inc: { downloadCount: 1 } },
          { timestamps: false },
        );
      } catch (error) {
        console.error("[reader] failed to count download:", error);
      }
    });
  }

  // The published material's outline, for the reader's Contents tab, and
  // whether its details are still waiting for review
  const material = await (await getMaterialModel())
    .findOne({ bookId: found.book._id, isActive: true })
    .select("outline status")
    .lean<{ _id: unknown; outline?: MaterialOutline; status?: string }>()
    .catch(() => null);

  return {
    kind: "ok",
    book: {
      ...toBookDto(found.book),
      fileUrl,
      outline: material?.outline ?? null,
      ...(material?.status === "unverified" ? { unverifiedMaterialId: String(material._id) } : {}),
    },
  };
}
