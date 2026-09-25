// GET  /api/books  - the signed-in user's library (paginated)
// POST /api/books  - record a book after the file has been uploaded to storage
import { NextResponse, type NextRequest } from "next/server";
import { getBookModel } from "@/lib/models/bookModel";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { storageClient } from "@/lib/storage";
import {
  BOOK_ALLOWED_MIME_TYPES,
  BOOK_MAX_FILE_SIZE,
  isOwnBookKey,
} from "@/lib/uploads";
import { toBookDto, type BookDoc } from "@/lib/dto/book";
import {
  getMaterialSubmissionModel,
  type SubmissionStatus,
} from "@/lib/models/materialSubmissionModel";
import { resolveBookAcademic, type BookAcademicBody } from "@/lib/submissions";

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

    const Book = await getBookModel();
    const filter = { uploaderId: session.userId };
    const [docs, total] = await Promise.all([
      Book.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<BookDoc[]>(),
      Book.countDocuments(filter),
    ]);

    // Attach each submission's pipeline status for the library cards
    const submissionIds = docs
      .filter((d) => d.hasSubmission && d.submissionId)
      .map((d) => d.submissionId!);
    const statuses = new Map<string, SubmissionStatus>();
    if (submissionIds.length) {
      const Submission = await getMaterialSubmissionModel();
      const subs = await Submission.find({ _id: { $in: submissionIds } }).select("status").lean();
      for (const s of subs) statuses.set(s._id.toString(), s.status);
    }

    return NextResponse.json({
      books: docs.map((doc) =>
        toBookDto(doc, doc.submissionId ? statuses.get(doc.submissionId.toString()) : undefined),
      ),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/books");
  }
}

interface CreateBookBody extends BookAcademicBody {
  title: string;
  description: string;
  tags: string[];
  storageKey: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  checksum: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "upload");
    const body = await readJson<CreateBookBody>(request);

    const title = asTrimmedString(body?.title, 300);
    const description = asTrimmedString(body?.description, 2000);
    const storageKey = asTrimmedString(body?.storageKey, 400);
    const tags = Array.isArray(body?.tags)
      ? body.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 6)
      : [];
    const pageCount =
      typeof body?.pageCount === "number" && body.pageCount > 0
        ? Math.floor(body.pageCount)
        : undefined;
    const checksum = asTrimmedString(body?.checksum, 128) || undefined;

    if (!title || !storageKey) {
      return NextResponse.json(
        { message: "title and storageKey are required." },
        { status: 400 },
      );
    }

    // The key must be one issued to this user by /api/upload/presign, so a
    // user can't claim (and later delete) someone else's object.
    if (!isOwnBookKey(storageKey, session.userId)) {
      return NextResponse.json({ message: "Invalid storageKey." }, { status: 400 });
    }

    // Trust the bucket, not the client, for size and type.
    const head = await storageClient.fileExists(storageKey);
    if (head.error) {
      console.error("POST /api/books: storage check failed:", head.error);
      return NextResponse.json(
        { message: "Storage is unavailable. Please try again." },
        { status: 502 },
      );
    }
    if (!head.exists || !head.fileInfo) {
      return NextResponse.json(
        { message: "Upload not found. Upload the file first." },
        { status: 400 },
      );
    }
    const { size, contentType } = head.fileInfo;
    if (
      size > BOOK_MAX_FILE_SIZE ||
      !(BOOK_ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)
    ) {
      return NextResponse.json(
        { message: "Uploaded file is not an accepted PDF." },
        { status: 400 },
      );
    }

    const academic = await resolveBookAcademic(body);

    const Book = await getBookModel();
    const doc = await Book.create({
      ...academic,
      title,
      description: description || undefined,
      tags,
      storageKey,
      fileUrl: storageClient.getPublicUrl(storageKey),
      fileSize: size,
      mimeType: contentType,
      pageCount,
      checksum,
      uploaderId: session.userId,
      ownerUpid: session.upid,
      status: "pending",
      visibility: "private",
    });

    return NextResponse.json(
      { book: toBookDto(doc.toObject() as BookDoc) },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { message: "This upload has already been saved." },
        { status: 409 },
      );
    }
    return handleRouteError(error, "POST /api/books");
  }
}
