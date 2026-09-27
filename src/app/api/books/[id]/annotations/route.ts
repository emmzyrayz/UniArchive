// GET    /api/books/[id]/annotations - the caller's highlights and bookmarks
//                                      on this book (empty arrays if none)
// PUT    /api/books/[id]/annotations - replace them with the reader's full
//                                      current state (upsert; idempotent)
// DELETE /api/books/[id]/annotations - remove them all
//
// Annotations belong to the reader, not the book: anyone who may read the
// book (its owner, or any signed-in user once it's published in the
// UniLibrary) keeps their own set. Everyone else gets the same 404 as the
// book route.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { findReadableBook } from "@/lib/bookAccess";
import { getAnnotationModel, type IAnnotation } from "@/lib/models/annotationModel";
import { parseAnnotationsBody, toAnnotationsDto } from "@/lib/annotations";

type Context = { params: Promise<{ id: string }> };

const NO_STORE = { "Cache-Control": "private, no-store" };

const notFound = () => NextResponse.json({ message: "Book not found." }, { status: 404 });

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const found = await findReadableBook((await context.params).id, session);
    if (!found) return notFound();

    const Annotation = await getAnnotationModel();
    const doc = await Annotation.findOne({ userId: session.userId, bookId: found.book._id })
      .select("highlights bookmarks")
      .lean<Pick<IAnnotation, "highlights" | "bookmarks">>();
    return NextResponse.json(toAnnotationsDto(doc), { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]/annotations");
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    // The reader saves every 30s at most, plus when hidden or left
    enforceRateLimit(request, "annotations-save", 60);
    const found = await findReadableBook((await context.params).id, session);
    if (!found) return notFound();

    const parsed = parseAnnotationsBody(await readJson(request));
    if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });

    const savedAt = new Date();
    const Annotation = await getAnnotationModel();
    await Annotation.updateOne(
      { userId: new Types.ObjectId(session.userId), bookId: found.book._id },
      { $set: { ...parsed.value, lastSyncedAt: savedAt } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, savedAt }, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "PUT /api/books/[id]/annotations");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return notFound();

    // Only ever touches the caller's own document, so there's no read check:
    // a reader can still clear annotations on a book they've lost access to
    const Annotation = await getAnnotationModel();
    await Annotation.deleteOne({ userId: session.userId, bookId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/books/[id]/annotations");
  }
}
