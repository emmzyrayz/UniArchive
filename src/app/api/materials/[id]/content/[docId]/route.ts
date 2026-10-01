// PATCH  /api/materials/[id]/content/[docId] - edit typed notes
//   The author, or auditor+. Body: any subset of the POST fields;
//   sourceTextbookId null removes the link. Records lastEditedBy/At.
//   Optional baseUpdatedAt (the document's updatedAt when editing started):
//   if someone else saved it since, the edit is refused with 409 and the
//   current document, instead of overwriting their changes.
// DELETE /api/materials/[id]/content/[docId] - soft delete (isActive false)
//   The author, or com_admin+.
import { NextResponse, type NextRequest } from "next/server";
import { invalidateConversionStats } from "@/lib/conversionStats";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getContentDocumentModel, type IContentDocument } from "@/lib/models/contentDocumentModel";
import {
  atLeast,
  canEditNote,
  loadSourceTextbooks,
  noteWordCount,
  parseContentBody,
  refreshTypedContentFlag,
  toContentDocumentDto,
} from "@/lib/layer2";

type Context = { params: Promise<{ id: string; docId: string }> };

async function loadDoc(context: Context) {
  const { id, docId } = await context.params;
  if (!isValidObjectId(id) || !isValidObjectId(docId)) return null;
  const Doc = await getContentDocumentModel();
  return Doc.findOne({ _id: docId, materialId: id, isActive: true }).lean<IContentDocument>();
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `content-write:${session.userId}`);
    const doc = await loadDoc(context);
    if (!doc) return fail(404, "Document not found.");
    if (!canEditNote(session, doc)) {
      return fail(403, "You can only edit notes you wrote.");
    }

    const body = await readJson(request);
    let baseUpdatedAt: Date | undefined;
    if (body?.baseUpdatedAt !== undefined) {
      baseUpdatedAt = new Date(String(body.baseUpdatedAt));
      if (Number.isNaN(baseUpdatedAt.getTime())) return fail(400, "baseUpdatedAt must be a date.");
    }
    const parsed = await parseContentBody(body, true);
    if (!parsed.ok) return fail(400, parsed.message);
    const { sourceTextbookId, chapterTitle, ...rest } = parsed.value;
    if (sourceTextbookId && String(sourceTextbookId) === String(doc.materialId)) {
      return fail(400, "A document can't use its own material as the source textbook.");
    }

    const set: Record<string, unknown> = {
      ...rest,
      lastEditedBy: session.userId,
      lastEditedAt: new Date(),
      wordCount: noteWordCount({
        title: rest.title ?? doc.title,
        contentBlocks: rest.contentBlocks ?? doc.contentBlocks,
      }),
    };
    const unset: Record<string, ""> = {};
    if (sourceTextbookId === null) unset.sourceTextbookId = "";
    else if (sourceTextbookId) set.sourceTextbookId = sourceTextbookId;
    if (chapterTitle === undefined && "chapterTitle" in parsed.value) unset.chapterTitle = "";
    else if (chapterTitle) set.chapterTitle = chapterTitle;

    const Doc = await getContentDocumentModel();
    const updated = await Doc.findOneAndUpdate(
      { _id: doc._id, ...(baseUpdatedAt ? { updatedAt: baseUpdatedAt } : {}) },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after", runValidators: true },
    ).lean<IContentDocument>();
    if (!updated) {
      const current = baseUpdatedAt ? await Doc.findOne({ _id: doc._id, isActive: true }).lean<IContentDocument>() : null;
      if (!current) return fail(404, "Document not found.");
      const src = await loadSourceTextbooks([current.sourceTextbookId]);
      return NextResponse.json(
        {
          message: "This note was changed after you started editing. Review the latest version before saving again.",
          conflict: true,
          document: toContentDocumentDto(current, current.sourceTextbookId ? src.get(String(current.sourceTextbookId)) : undefined),
        },
        { status: 409 },
      );
    }

    // Its word count may have changed
    await invalidateConversionStats(String(updated.createdBy));
    const sources = await loadSourceTextbooks([updated.sourceTextbookId]);
    return NextResponse.json({
      document: toContentDocumentDto(
        updated,
        updated.sourceTextbookId ? sources.get(String(updated.sourceTextbookId)) : undefined,
      ),
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/materials/[id]/content/[docId]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `content-write:${session.userId}`);
    const doc = await loadDoc(context);
    if (!doc) return fail(404, "Document not found.");
    if (String(doc.createdBy) !== session.userId && !atLeast(session.role, "com_admin")) {
      return fail(403, "You can only delete notes you wrote.");
    }

    const Doc = await getContentDocumentModel();
    await Doc.updateOne(
      { _id: doc._id },
      { $set: { isActive: false, lastEditedBy: session.userId, lastEditedAt: new Date() } },
    );
    await refreshTypedContentFlag(doc.materialId);
    await invalidateConversionStats(String(doc.createdBy));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/materials/[id]/content/[docId]");
  }
}
