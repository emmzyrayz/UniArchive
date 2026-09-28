// GET    /api/books/[id]/annotations - the caller's highlights and bookmarks
//                                      on this book (empty arrays if none)
// PUT    /api/books/[id]/annotations - replace them with the reader's full
//                                      current state, based on syncVersion
//   Body: { highlights, bookmarks, syncVersion } where syncVersion is the
//   version the reader last loaded or saved. The write only lands if that's
//   still the stored version, then bumps it; otherwise another tab saved
//   first and the reply is 409 with the current server copy to merge.
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
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { findReadableBook } from "@/lib/bookAccess";
import { getAnnotationModel, type IAnnotation } from "@/lib/models/annotationModel";
import { parseAnnotationsBody, toVersionedAnnotationsDto } from "@/lib/annotations";
import { isDuplicateKey } from "@/lib/adminApi";

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
      .select("highlights bookmarks syncVersion")
      .lean<Pick<IAnnotation, "highlights" | "bookmarks" | "syncVersion">>();
    return NextResponse.json(toVersionedAnnotationsDto(doc), { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]/annotations");
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    // The reader saves every 30s at most, plus when hidden or left
    await enforceRateLimit(request, "standard", `annotations-save:${session.userId}`);
    const found = await findReadableBook((await context.params).id, session);
    if (!found) return notFound();

    const body = await readJson(request);
    const parsed = parseAnnotationsBody(body);
    if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });
    const baseVersion = body?.syncVersion ?? 0;
    if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) {
      return NextResponse.json({ message: "syncVersion must be a whole number." }, { status: 400 });
    }

    const owner = { userId: new Types.ObjectId(session.userId), bookId: found.book._id };
    const savedAt = new Date();
    const Annotation = await getAnnotationModel();

    // Only lands if nobody saved since this reader's copy. Version 0 also
    // matches documents from before syncVersion existed, and creates the
    // document if there's none; if one already exists at a later version
    // the upsert hits the unique index instead.
    let saved: Pick<IAnnotation, "syncVersion"> | null = null;
    try {
      saved = await Annotation.findOneAndUpdate(
        baseVersion === 0
          ? { ...owner, $or: [{ syncVersion: 0 }, { syncVersion: { $exists: false } }] }
          : { ...owner, syncVersion: baseVersion },
        { $set: { ...parsed.value, lastSyncedAt: savedAt }, $inc: { syncVersion: 1 } },
        { upsert: baseVersion === 0, returnDocument: "after", projection: { syncVersion: 1 } },
      ).lean<Pick<IAnnotation, "syncVersion">>();
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }

    if (!saved) {
      const current = await Annotation.findOne(owner)
        .select("highlights bookmarks syncVersion")
        .lean<Pick<IAnnotation, "highlights" | "bookmarks" | "syncVersion">>();
      return NextResponse.json(
        {
          conflict: true,
          message: "Annotations updated in another tab.",
          current: toVersionedAnnotationsDto(current),
        },
        { status: 409, headers: NO_STORE },
      );
    }
    return NextResponse.json(
      { success: true, savedAt, syncVersion: saved.syncVersion },
      { headers: NO_STORE },
    );
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
