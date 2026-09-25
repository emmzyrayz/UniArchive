// GET    /api/submissions/[id] - one submission with its book (submitter only)
// PATCH  /api/submissions/[id] - edit a draft/rejected submission
// DELETE /api/submissions/[id] - delete a draft/rejected submission
//
// Verified submissions become public in Phase D; until then everything here
// is visible only to the submitter.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getBookModel } from "@/lib/models/bookModel";
import { toBookDto, type BookDoc } from "@/lib/dto/book";
import {
  EDITABLE_SUBMISSION_STATUSES,
  getMaterialSubmissionModel,
} from "@/lib/models/materialSubmissionModel";
import {
  loadOwnedBook,
  parseSubmissionBody,
  saveSubmission,
  type SubmissionBody,
} from "@/lib/submissions";

type Context = { params: Promise<{ id: string }> };

const notFound = () =>
  NextResponse.json({ message: "Submission not found." }, { status: 404 });

/** The caller's own submission, or null (someone else's reads as not found). */
async function findOwnSubmission(request: NextRequest, context: Context) {
  const session = await requireAuth(request);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return null;
  const Submission = await getMaterialSubmissionModel();
  const submission = await Submission.findById(id).lean();
  if (!submission || submission.submittedBy.toString() !== session.userId) return null;
  return { session, Submission, submission };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const found = await findOwnSubmission(request, context);
    if (!found) return notFound();

    const Book = await getBookModel();
    const book = await Book.findById(found.submission.bookId).lean<BookDoc>();

    return NextResponse.json(
      {
        submission: found.submission,
        book: book ? toBookDto(book, found.submission.status) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/submissions/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const found = await findOwnSubmission(request, context);
    if (!found) return notFound();
    const { session, submission } = found;
    enforceRateLimit(request, `submissions:${session.userId}`, 30);

    if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status)) {
      return NextResponse.json(
        { message: "Only draft or rejected submissions can be edited." },
        { status: 403 },
      );
    }

    // The book is fixed by the submission; a bookId in the body is ignored
    const input = parseSubmissionBody(await readJson<SubmissionBody>(request));
    const book = await loadOwnedBook(submission.bookId.toString(), session.userId);
    const updated = await saveSubmission(session, book, submission, input);
    return NextResponse.json({ submission: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/submissions/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const found = await findOwnSubmission(request, context);
    if (!found) return notFound();
    const { Submission, submission } = found;

    const deleted = await Submission.deleteOne({
      _id: submission._id,
      status: { $in: EDITABLE_SUBMISSION_STATUSES },
    });
    if (deleted.deletedCount === 0) {
      return NextResponse.json(
        { message: "Only draft or rejected submissions can be deleted." },
        { status: 403 },
      );
    }

    const Book = await getBookModel();
    await Book.updateOne(
      { _id: submission.bookId, submissionId: submission._id },
      { $set: { hasSubmission: false }, $unset: { submissionId: "" } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/submissions/[id]");
  }
}
