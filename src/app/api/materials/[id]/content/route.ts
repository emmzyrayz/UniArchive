// GET  /api/materials/[id]/content - public
//   The material's typed notes (active ContentDocuments), chapter order,
//   each with its source textbook if it has one.
// POST /api/materials/[id]/content - collaborator+ only
//   Notes and textbook materials only (LEARNING_AIDS, BOOKS).
//   Body: { documentType, title, chapterNumber?, chapterTitle?,
//   sourceTextbookId?, contentBlocks } (BlockEditor blocks, up to 500).
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getContentDocumentModel, type IContentDocument } from "@/lib/models/contentDocumentModel";
import { NOTE_CATEGORIES } from "@/lib/constants/layer2";
import {
  atLeast,
  loadActiveMaterial,
  loadSourceTextbooks,
  parseContentBody,
  refreshTypedContentFlag,
  toContentDocumentDto,
} from "@/lib/layer2";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `content:${getClientIp(request)}`);
    const material = await loadActiveMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");

    const Doc = await getContentDocumentModel();
    const docs = await Doc.find({ materialId: material._id, isActive: true })
      .sort({ chapterNumber: 1, createdAt: 1, _id: 1 })
      .lean<IContentDocument[]>();
    const sources = await loadSourceTextbooks(docs.map((d) => d.sourceTextbookId));

    return NextResponse.json(
      {
        documents: docs.map((d) =>
          toContentDocumentDto(d, d.sourceTextbookId ? sources.get(String(d.sourceTextbookId)) : undefined),
        ),
        total: docs.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/content");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    if (!atLeast(session.role, "collaborator")) {
      return fail(403, "Typed notes can be added by Collaborators and above.");
    }
    await enforceRateLimit(request, "standard", `content-write:${session.userId}`);
    const material = await loadActiveMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");
    if (!NOTE_CATEGORIES.includes(material.category)) {
      return fail(400, "Typed notes can only be added to notes and textbook materials.");
    }

    const parsed = await parseContentBody(await readJson(request), false);
    if (!parsed.ok) return fail(400, parsed.message);
    if (parsed.value.sourceTextbookId && String(parsed.value.sourceTextbookId) === String(material._id)) {
      return fail(400, "A document can't use its own material as the source textbook.");
    }

    const Doc = await getContentDocumentModel();
    const { sourceTextbookId, ...rest } = parsed.value;
    const created = await Doc.create({
      ...rest,
      ...(sourceTextbookId ? { sourceTextbookId } : {}),
      materialId: material._id,
      createdBy: session.userId,
      createdByUpid: session.upid,
    });
    await refreshTypedContentFlag(material._id);

    const sources = await loadSourceTextbooks([created.sourceTextbookId]);
    return NextResponse.json(
      {
        document: toContentDocumentDto(
          created.toObject(),
          created.sourceTextbookId ? sources.get(String(created.sourceTextbookId)) : undefined,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/content");
  }
}
