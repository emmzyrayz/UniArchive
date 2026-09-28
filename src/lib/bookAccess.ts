// src/lib/bookAccess.ts
// Who may read a Book. The owner always can. Any signed-in user can read a
// book that backs an active UniLibrary Material (it has been verified and
// published). A reviewer (anyone with "admin.view_submissions") can read a
// book once it has been submitted to the UniLibrary — drafts stay private —
// so they can check the PDF while reviewing. Everyone else gets null, which
// routes turn into a 404.
import { isValidObjectId, type Types } from "mongoose";
import { getBookModel } from "@/lib/models/bookModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { BookDoc } from "@/lib/dto/book";

export interface ReadableBook {
  book: BookDoc;
  isOwner: boolean;
  /** Set when a non-owner can read it because it's a published Material */
  publishedMaterialId?: Types.ObjectId;
}

export async function findReadableBook(
  id: string,
  session: SessionUser,
): Promise<ReadableBook | null> {
  if (!isValidObjectId(id)) return null;
  const Book = await getBookModel();
  const book = await Book.findById(id).lean<BookDoc>();
  if (!book) return null;
  if (book.uploaderId.toString() === session.userId) return { book, isOwner: true };

  const Material = await getMaterialModel();
  const published = await Material.exists({ bookId: book._id, isActive: true });
  if (published) {
    return { book, isOwner: false, publishedMaterialId: published._id };
  }

  if (!can(session.role, "admin.view_submissions") || !book.submissionId) return null;
  const Submission = await getMaterialSubmissionModel();
  const underReview = await Submission.exists({
    _id: book.submissionId,
    bookId: book._id,
    status: { $ne: "draft" },
  });
  return underReview ? { book, isOwner: false } : null;
}
