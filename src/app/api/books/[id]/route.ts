// GET    /api/books/[id]  - one book (owner only)
// PATCH  /api/books/[id]  - edit title/description (owner only)
// DELETE /api/books/[id]  - delete the file from storage (B2 or Cloudinary),
//                            then the record. Refused while the book has a
//                            submission under review or published.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getBookModel } from "@/lib/models/bookModel";
import { requireAuth } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { storageClient } from "@/lib/storage";
import { deleteCloudinaryPdf, getCloudinaryPdfUrl } from "@/lib/cloudinary";
import { toBookDto, type BookDoc } from "@/lib/dto/book";
import {
  EDITABLE_SUBMISSION_STATUSES,
  getMaterialSubmissionModel,
} from "@/lib/models/materialSubmissionModel";

type Context = { params: Promise<{ id: string }> };

// Long enough for a reading session: pdf.js keeps making range requests
// against the same URL as the reader scrolls.
const READ_URL_TTL_SECONDS = 4 * 60 * 60;

// Non-owners get the same 404 as a missing book, so ids can't be probed.
const notFound = () =>
  NextResponse.json({ message: "Book not found." }, { status: 404 });

async function findOwnedBook(request: NextRequest, context: Context) {
  const session = await requireAuth(request);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return null;

  const Book = await getBookModel();
  const book = await Book.findOne({ _id: id, uploaderId: session.userId }).lean<BookDoc>();
  return book ? { Book, book } : null;
}

const isCloudinary = (book: BookDoc) =>
  book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;

async function signedReadUrl(book: BookDoc): Promise<string | null> {
  if (isCloudinary(book)) {
    try {
      return getCloudinaryPdfUrl(book.cloudinaryPublicId!);
    } catch (error) {
      console.error("GET /api/books/[id]: failed to sign Cloudinary URL:", error);
      return null;
    }
  }
  const signed = await storageClient.generatePresignedDownloadUrl(
    book.storageKey,
    READ_URL_TTL_SECONDS,
  );
  if (!signed.success || !signed.downloadUrl) {
    console.error("GET /api/books/[id]: failed to sign download URL:", signed.error);
    return null;
  }
  return signed.downloadUrl;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const found = await findOwnedBook(request, context);
    if (!found) return notFound();

    // ?meta=1: just the record (e.g. the submission form). No signed URL,
    // and it doesn't count as opening the book.
    if (request.nextUrl.searchParams.get("meta") === "1") {
      return NextResponse.json(
        { book: toBookDto(found.book) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // Storage is private, so the stored URL can't be read by the browser.
    // Hand the owner a signed URL instead.
    const fileUrl = await signedReadUrl(found.book);
    if (!fileUrl) {
      return NextResponse.json(
        { message: "Storage is unavailable. Please try again." },
        { status: 502 },
      );
    }

    // Fire-and-forget: a failed bookkeeping write must never block or break
    // the read. timestamps: false so opening a book doesn't bump updatedAt.
    found.Book.updateOne(
      { _id: found.book._id },
      { $set: { lastOpenedAt: new Date() } },
      { timestamps: false },
    )
      .exec()
      .catch((error) => {
        console.error("GET /api/books/[id]: failed to update lastOpenedAt:", error);
      });

    return NextResponse.json(
      { book: { ...toBookDto(found.book), fileUrl } },
      // Signed URLs expire; never let a cache serve a stale one
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const found = await findOwnedBook(request, context);
    if (!found) return notFound();
    const body = await readJson<{ title: string; description: string }>(request);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const set: Record<string, string> = {};
    const unset: Record<string, ""> = {};
    if (body.title !== undefined) {
      const title = asTrimmedString(body.title, 300);
      if (!title) {
        return NextResponse.json({ message: "Title cannot be empty." }, { status: 400 });
      }
      set.title = title;
    }
    if (body.description !== undefined) {
      const description = asTrimmedString(body.description, 2000);
      if (description) set.description = description;
      else unset.description = "";
    }

    const book = await found.Book.findByIdAndUpdate(
      found.book._id,
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true },
    ).lean<BookDoc>();
    return NextResponse.json({ book: book ? toBookDto(book) : null });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/books/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const found = await findOwnedBook(request, context);
    if (!found) return notFound();
    const { Book, book } = found;

    // A book under review or in the UniLibrary backs that submission's file
    const Submission = await getMaterialSubmissionModel();
    const submission = await Submission.findOne({ bookId: book._id }).select("status").lean();
    if (submission && !EDITABLE_SUBMISSION_STATUSES.includes(submission.status)) {
      return NextResponse.json(
        {
          message:
            submission.status === "verified"
              ? "This document is published in the UniLibrary and can't be deleted."
              : "This document is being reviewed for the UniLibrary and can't be deleted right now.",
        },
        { status: 409 },
      );
    }

    const removed = isCloudinary(book)
      ? await deleteCloudinaryPdf(book.cloudinaryPublicId!)
      : await storageClient.deleteFile(book.storageKey);
    if (!removed.success) {
      console.error("DELETE /api/books/[id]: storage delete failed:", removed.error);
      return NextResponse.json(
        { message: "Could not delete the file. Please try again." },
        { status: 502 },
      );
    }

    await Book.deleteOne({ _id: book._id });
    if (submission) {
      await Submission.deleteOne({
        _id: submission._id,
        status: { $in: EDITABLE_SUBMISSION_STATUSES },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/books/[id]");
  }
}
