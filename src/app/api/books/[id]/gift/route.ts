// POST /api/books/[id]/gift   { note, consent: true }
// "PDF gifting": the owner gives a copy of one of their library documents to
// UniArchive instead of submitting it for credit. A short note says what it
// is; their school, faculty, department and level come from their profile.
// Admins publish it from the gift queue as UniArchive's.
//
// The file is copied into platform storage (platform/gifts/<owner>/...), so
// the owner keeps their own copy and deleting it never breaks the gift. The
// owner gets no credit: no badges, counts or emails. A document can be
// gifted once, and not after it's been submitted to the UniLibrary.
// 10 gifts per user per day.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { storageClient } from "@/lib/storage";
import { newPdfJob } from "@/lib/pdfJobs";
import { getCloudinaryPdfUrl } from "@/lib/cloudinary";
import { CLOUDINARY_MAX_SIZE } from "@/lib/storageRouter";
import { LIBRARY_BOOKS, getBookModel, type BookStorageProvider } from "@/lib/models/bookModel";
import { getUserModel } from "@/lib/models/userModel";

type Context = { params: Promise<{ id: string }> };

const NOTE_MIN = 10;
const NOTE_MAX = 1000;

const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

/** Copies the library file into platform storage; returns the new key and size. */
async function copyToPlatform(
  book: { storageProvider?: BookStorageProvider; storageKey: string; cloudinaryPublicId?: string; title: string },
  ownerId: string,
): Promise<{ key: string; size: number } | null> {
  const key = `platform/gifts/${ownerId}/${storageClient.generateUniqueFileName(`${book.title.slice(0, 80)}.pdf`)}`;

  if (book.storageProvider === "cloudinary" && book.cloudinaryPublicId) {
    // Small files (Cloudinary caps them at 10 MB): fetch the bytes and put
    // them in B2, which is where every platform file lives
    const res = await fetch(getCloudinaryPdfUrl(book.cloudinaryPublicId));
    if (!res.ok) {
      console.error("gift: Cloudinary download failed:", res.status);
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > CLOUDINARY_MAX_SIZE) return null;
    const put = await storageClient.uploadFile(bytes, key, "application/pdf");
    if (!put.success) {
      console.error("gift: B2 upload failed:", put.error);
      return null;
    }
    return { key, size: bytes.length };
  }

  const copied = await storageClient.copyFile(book.storageKey, key);
  if (!copied.success) {
    console.error("gift: B2 copy failed:", copied.error);
    return null;
  }
  const head = await storageClient.fileExists(key);
  return head.exists && head.fileInfo ? { key, size: head.fileInfo.size } : null;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "gift", `gift:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Document not found.");

    const body = await readJson<{ note: string; consent: boolean }>(request);
    const note = typeof body?.note === "string" ? body.note.trim().replace(/\s+\n/g, "\n") : "";
    if (note.length < NOTE_MIN || note.length > NOTE_MAX) {
      return fail(400, `Say what this PDF is about in ${NOTE_MIN}-${NOTE_MAX} characters.`);
    }
    if (body?.consent !== true) {
      return fail(400, "Confirm you have the right to share this and are giving it to UniArchive.");
    }

    const Book = await getBookModel();
    const book = await Book.findOne({ _id: id, uploaderId: session.userId, ...LIBRARY_BOOKS }).lean();
    if (!book) return fail(404, "Document not found.");
    if (book.giftedAt) return fail(409, "You've already gifted this document to UniArchive.");
    if (book.hasSubmission) {
      return fail(409, "This document has a UniLibrary submission, so it can't be gifted as well.");
    }

    // Claim the gift first, so a double click or a concurrent submission
    // can't also go through
    const now = new Date();
    const claimed = await Book.findOneAndUpdate(
      { _id: book._id, giftedAt: { $exists: false }, hasSubmission: { $ne: true } },
      { $set: { giftedAt: now } },
      { projection: { _id: 1 } },
    ).lean();
    if (!claimed) return fail(409, "This document changed. Reload and try again.");
    const release = () =>
      Book.updateOne({ _id: book._id }, { $unset: { giftedAt: "" } }).catch((error) =>
        console.error("gift: failed to release claim:", error),
      );

    let copy: { key: string; size: number } | null = null;
    try {
      copy = await copyToPlatform(book, session.userId);
      if (!copy) {
        await release();
        return fail(502, "Storage is unavailable, so the gift didn't go through. Please try again.");
      }

      const User = await getUserModel();
      const profile = await User.findById(session.userId)
        .select("universityId universityName universityAbbr facultyId facultyName departmentId departmentName level semester")
        .lean();

      await Book.create({
        title: book.title,
        description: note,
        fileUrl: storageClient.getPublicUrl(copy.key),
        storageKey: copy.key,
        storageProvider: "backblaze",
        fileSize: copy.size,
        pageCount: book.pageCount,
        mimeType: "application/pdf",
        // The gifter, recorded for the trail and abuse handling; never credited
        uploaderId: session.userId,
        ownerUpid: session.upid,
        status: "pending",
        visibility: "private",
        pdfJob: newPdfJob(true),
        platform: {
          source: "gift",
          status: "pending",
          uploadedBy: session.userId,
          uploadedByUpid: session.upid,
          originalFileName: `${book.title}.pdf`,
          originalSize: copy.size,
          sourceBookId: book._id,
          gift: {
            note,
            universityId: profile?.universityId,
            universityName: profile?.universityName,
            universityAbbr: profile?.universityAbbr,
            facultyId: profile?.facultyId,
            facultyName: profile?.facultyName,
            departmentId: profile?.departmentId,
            departmentName: profile?.departmentName,
            level: profile?.level,
            semester: profile?.semester,
          },
        },
      });
    } catch (error) {
      await release();
      if (copy) await storageClient.deleteFile(copy.key).catch(() => undefined);
      if ((error as { code?: number }).code === 11000) {
        return fail(409, "You've already gifted this document to UniArchive.");
      }
      throw error;
    }

    return NextResponse.json({ success: true, giftedAt: now.toISOString() }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/books/[id]/gift");
  }
}
