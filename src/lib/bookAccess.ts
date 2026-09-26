// src/lib/bookAccess.ts
// Who may read a Book. The owner always can. A reviewer (anyone with
// "admin.view_submissions") can read a book once it has been submitted to
// the UniLibrary — drafts stay private — so they can check the PDF while
// reviewing. Everyone else gets null, which routes turn into a 404.
import { isValidObjectId } from "mongoose";
import { getBookModel } from "@/lib/models/bookModel";
import { getMaterialSubmissionModel } from "@/lib/models/materialSubmissionModel";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { BookDoc } from "@/lib/dto/book";

export async function findReadableBook(
  id: string,
  session: SessionUser,
): Promise<{ book: BookDoc; isOwner: boolean } | null> {
  if (!isValidObjectId(id)) return null;
  const Book = await getBookModel();
  const book = await Book.findById(id).lean<BookDoc>();
  if (!book) return null;
  if (book.uploaderId.toString() === session.userId) return { book, isOwner: true };

  if (!can(session.role, "admin.view_submissions") || !book.submissionId) return null;
  const Submission = await getMaterialSubmissionModel();
  const underReview = await Submission.exists({
    _id: book.submissionId,
    bookId: book._id,
    status: { $ne: "draft" },
  });
  return underReview ? { book, isOwner: false } : null;
}
