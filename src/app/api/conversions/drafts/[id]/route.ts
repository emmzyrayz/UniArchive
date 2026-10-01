// /api/conversions/drafts/:id — one of the signed-in user's drafts.
//
// GET     the draft (any status).
// PUT     { payload, baseRevision, deviceId?, lastPage? }
//         Saves an active draft. Only applies if baseRevision is the
//         server's current revision (then revision + 1); otherwise 409 with
//         the server's copy, so two devices never silently overwrite each
//         other. The payload is only shape-checked (lib/conversions.ts).
// DELETE  discards an active draft (status "abandoned").
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { draftExpiry, getConversionDraftModel, type IConversionDraft } from "@/lib/models/conversionDraftModel";
import { checkDraftPayload, type DraftPayload } from "@/lib/conversions";
import { loadOwnDraft, toDraftDto } from "@/lib/conversionDrafts";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const draft = await loadOwnDraft((await context.params).id, session.userId);
    if (!draft) return fail(404, "Draft not found.");
    return NextResponse.json({ draft: toDraftDto(draft) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/conversions/drafts/[id]");
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    // Autosave runs every ~10s per open draft; the standard limit is ample
    await enforceRateLimit(request, "standard", `drafts-save:${session.userId}`);
    const draft = await loadOwnDraft((await context.params).id, session.userId);
    if (!draft) return fail(404, "Draft not found.");
    if (draft.status !== "active") return fail(409, `This draft is already ${draft.status}.`);

    const body = await readJson<{ payload: DraftPayload; baseRevision: number; deviceId: string; lastPage: number }>(request);
    const baseRevision = body?.baseRevision;
    if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 1) {
      return fail(400, "baseRevision is required.");
    }
    const check = checkDraftPayload(draft.kind, body?.payload);
    if (!check.ok) return fail(check.ok === false && /too large/.test(check.message) ? 413 : 400, check.message);
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId.slice(0, 64) : undefined;
    const lastPage =
      typeof body?.lastPage === "number" && Number.isInteger(body.lastPage) && body.lastPage > 0 && body.lastPage <= 100_000
        ? body.lastPage
        : undefined;

    const now = new Date();
    const Draft = await getConversionDraftModel();
    const saved = await Draft.findOneAndUpdate(
      { _id: draft._id, status: "active", revision: baseRevision },
      {
        $set: {
          payload: body!.payload,
          expiresAt: draftExpiry(now),
          ...(deviceId ? { lastDeviceId: deviceId } : {}),
          ...(lastPage ? { lastPage } : {}),
        },
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    ).lean<IConversionDraft>();

    if (!saved) {
      const current = await loadOwnDraft(String(draft._id), session.userId);
      if (!current || current.status !== "active") return fail(409, "This draft was finished or discarded elsewhere.");
      return NextResponse.json(
        {
          message: "This draft was changed on another device or tab.",
          conflict: true,
          draft: toDraftDto(current),
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ draft: toDraftDto(saved) });
  } catch (error) {
    return handleRouteError(error, "PUT /api/conversions/drafts/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const draft = await loadOwnDraft((await context.params).id, session.userId);
    if (!draft) return fail(404, "Draft not found.");
    const Draft = await getConversionDraftModel();
    await Draft.updateOne({ _id: draft._id, status: "active" }, { $set: { status: "abandoned" } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/conversions/drafts/[id]");
  }
}
