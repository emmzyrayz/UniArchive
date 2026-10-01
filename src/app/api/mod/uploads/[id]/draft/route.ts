// PUT /api/mod/uploads/:id/draft   { draft }
// Saves the verify form's state so a reviewer can come back to a file later.
// The draft is the client's form state, stored as-is (at most 32 KB) and only
// validated when publishing. Refused while someone else holds the claim.
// Permission: "material.ingest" + canWorkOn.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { getBookModel } from "@/lib/models/bookModel";
import { MAX_DRAFT_BYTES, claimedByOther, loadPlatformFile } from "@/lib/platformUploads";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    const book = await loadPlatformFile((await context.params).id, session);
    if (book.platform.status !== "pending") {
      return NextResponse.json({ message: `This file is already ${book.platform.status}.` }, { status: 409 });
    }
    if (claimedByOther(book.platform, session.userId)) {
      return NextResponse.json(
        { message: `@${book.platform.claimedByUpid} is working on this file right now.` },
        { status: 409 },
      );
    }

    const body = await readJson<{ draft: Record<string, unknown> }>(request);
    const draft = body?.draft;
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
      return NextResponse.json({ message: "draft must be an object." }, { status: 400 });
    }
    if (Buffer.byteLength(JSON.stringify(draft)) > MAX_DRAFT_BYTES) {
      return NextResponse.json({ message: "This draft is too large to save." }, { status: 413 });
    }

    const savedAt = new Date();
    const Book = await getBookModel();
    await Book.updateOne(
      { _id: book._id, "platform.status": "pending" },
      { $set: { "platform.draft": draft, "platform.draftSavedAt": savedAt } },
    );
    return NextResponse.json({ savedAt: savedAt.toISOString() });
  } catch (error) {
    return handleRouteError(error, "PUT /api/mod/uploads/[id]/draft");
  }
}
