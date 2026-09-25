// GET  /api/submissions - the signed-in user's submissions (paginated)
// POST /api/submissions - create or update a book's submission
//                         (action: "save_draft" | "submit")
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getBookModel } from "@/lib/models/bookModel";
import {
  SUBMISSION_STATUSES,
  getMaterialSubmissionModel,
  type SubmissionStatus,
} from "@/lib/models/materialSubmissionModel";
import {
  loadOwnedBook,
  parseSubmissionBody,
  saveSubmission,
  type SubmissionBody,
} from "@/lib/submissions";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const params = request.nextUrl.searchParams;

    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(params.get("limit") ?? "20", 10) || 20),
    );
    // ?status=submitted,in_review
    const statuses = (params.get("status") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const unknown = statuses.filter(
      (s) => !(SUBMISSION_STATUSES as readonly string[]).includes(s),
    );
    if (unknown.length) {
      return NextResponse.json(
        { message: `Unknown status: ${unknown.join(", ")}.` },
        { status: 400 },
      );
    }

    const filter: Record<string, unknown> = { submittedBy: session.userId };
    if (statuses.length) filter.status = { $in: statuses as SubmissionStatus[] };

    const Submission = await getMaterialSubmissionModel();
    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .select("-reviewNotes")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    const Book = await getBookModel();
    const books = await Book.find({ _id: { $in: submissions.map((s) => s.bookId) } })
      .select("title")
      .lean();
    const titles = new Map(books.map((b) => [b._id.toString(), b.title]));

    return NextResponse.json(
      {
        submissions: submissions.map((s) => ({
          ...s,
          bookTitle: titles.get(s.bookId.toString()) ?? s.title,
        })),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/submissions");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    enforceRateLimit(request, `submissions:${session.userId}`, 30);

    const body = await readJson<SubmissionBody>(request);
    const input = parseSubmissionBody(body);
    const book = await loadOwnedBook(
      typeof body?.bookId === "string" ? body.bookId.trim() : "",
      session.userId,
    );

    const Submission = await getMaterialSubmissionModel();
    const existing = await Submission.findOne({ bookId: book._id })
      .select("_id status")
      .lean();

    const submission = await saveSubmission(session, book, existing, input);
    return NextResponse.json({ submission }, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/submissions");
  }
}
