// /api/conversions/drafts — the signed-in user's conversion drafts.
//
// GET   their active drafts, newest first, with the material's title and a
//       progress summary (dashboard Conversions tab).
// POST  { materialId, kind: "questions" | "note", targetDocId? }
//       Opens the draft for this material (get or create): 200 with the
//       existing active draft, or 201 with a new one. Who may convert what
//       is the same as for typed content today (lib/conversionDrafts.ts).
//       At most DRAFT_LIMITS.activeDraftsPerUser active drafts.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { draftExpiry, getConversionDraftModel, type IConversionDraft } from "@/lib/models/conversionDraftModel";
import { CONVERSION_KINDS, DRAFT_LIMITS, countWords, type ConversionKind, type DraftPayload } from "@/lib/conversions";
import { checkConversionAccess, startingPayload, toDraftDto } from "@/lib/conversionDrafts";

const STALE_MS = DRAFT_LIMITS.staleDays * 24 * 60 * 60 * 1000;

function progress(kind: ConversionKind, payload: DraftPayload) {
  if (kind === "questions" && "questions" in payload) {
    const total = payload.questions.length;
    const submitted = payload.questions.filter((q) => q.submittedId).length;
    return { questions: total, submitted };
  }
  if ("note" in payload) {
    const words = payload.note.contentBlocks.reduce((n, b) => n + countWords(b.content), countWords(payload.note.title));
    return { words, title: payload.note.title };
  }
  return {};
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const Draft = await getConversionDraftModel();
    const drafts = await Draft.find({ userId: new Types.ObjectId(session.userId), status: "active" })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean<IConversionDraft[]>();

    const Material = await getMaterialModel();
    const materials = await Material.find({ _id: { $in: drafts.map((d) => d.materialId) } })
      .select("title courseCode category isActive")
      .lean();
    const byId = new Map(materials.map((m) => [String(m._id), m]));
    const now = Date.now();

    return NextResponse.json(
      {
        drafts: drafts.map((d) => {
          const m = byId.get(String(d.materialId));
          return {
            id: String(d._id),
            materialId: String(d.materialId),
            materialTitle: m?.title ?? "Unavailable material",
            courseCode: m?.courseCode,
            materialAvailable: !!m?.isActive,
            kind: d.kind,
            ...(d.targetDocId ? { targetDocId: String(d.targetDocId) } : {}),
            updatedAt: new Date(d.updatedAt).toISOString(),
            stale: now - new Date(d.updatedAt).getTime() > STALE_MS,
            progress: progress(d.kind, d.payload),
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/conversions/drafts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `drafts-open:${session.userId}`);
    const body = await readJson<{ materialId: string; kind: string; targetDocId: string }>(request);
    const kind = body?.kind as ConversionKind;
    if (!(CONVERSION_KINDS as readonly string[]).includes(kind)) return fail(400, 'kind must be "questions" or "note".');
    const materialId = typeof body?.materialId === "string" ? body.materialId : "";
    const targetDocId = typeof body?.targetDocId === "string" && body.targetDocId ? body.targetDocId : undefined;

    const access = await checkConversionAccess(session, materialId, kind, targetDocId);
    if (!access.ok) return fail(access.status, access.message);

    const Draft = await getConversionDraftModel();
    const key = {
      userId: new Types.ObjectId(session.userId),
      materialId: access.material._id,
      kind,
      targetKey: access.targetDoc ? String(access.targetDoc._id) : "new",
      status: "active" as const,
    };
    const existing = await Draft.findOne(key).lean<IConversionDraft>();
    if (existing) return NextResponse.json({ draft: toDraftDto(existing), created: false });

    const active = await Draft.countDocuments({ userId: key.userId, status: "active" });
    if (active >= DRAFT_LIMITS.activeDraftsPerUser) {
      return fail(
        409,
        `You have ${active} conversions in progress. Finish or discard one from your dashboard before starting another.`,
      );
    }

    try {
      const created = await Draft.create({
        ...key,
        userUpid: session.upid,
        ...(access.targetDoc
          ? { targetDocId: access.targetDoc._id, baseDocUpdatedAt: access.targetDoc.updatedAt }
          : {}),
        payload: startingPayload(kind, access.targetDoc),
        revision: 1,
        expiresAt: draftExpiry(),
      });
      return NextResponse.json({ draft: toDraftDto(created.toObject()), created: true }, { status: 201 });
    } catch (error) {
      // Opened in two tabs at once: the other request created it
      if (isDuplicateKey(error)) {
        const raced = await Draft.findOne(key).lean<IConversionDraft>();
        if (raced) return NextResponse.json({ draft: toDraftDto(raced), created: false });
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/conversions/drafts");
  }
}
