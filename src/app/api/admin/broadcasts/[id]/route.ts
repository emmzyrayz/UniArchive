// /api/admin/broadcasts/[id]. Permission: "mail.broadcast".
// GET     the broadcast
// PATCH   { name?, kind?, fields?, audience? }: drafts only (409 otherwise).
//         Send the whole fields object; it replaces the stored one.
// DELETE  drafts only
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getBroadcastModel, type IBroadcast } from "@/lib/models/broadcastModel";
import { cleanDraft, toBroadcastDto } from "@/lib/broadcast/drafts";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "mail.broadcast");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    const Broadcast = await getBroadcastModel();
    const doc = await Broadcast.findById(id).lean<IBroadcast>();
    if (!doc) return fail(404, "Broadcast not found.");
    return NextResponse.json({ broadcast: toBroadcastDto(doc) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/broadcasts/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `broadcasts:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    const input = await readJson<Record<string, unknown>>(request);
    if (!input) return fail(400, "Invalid request body.");

    const Broadcast = await getBroadcastModel();
    const current = await Broadcast.findById(id).lean<IBroadcast>();
    if (!current) return fail(404, "Broadcast not found.");
    if (current.status !== "draft") return fail(409, "Only drafts can be edited.");

    const draft = await cleanDraft({
      templateId: current.templateId,
      name: input.name ?? current.name,
      kind: input.kind ?? current.kind,
      fields: input.fields ?? current.fields,
      audience: input.audience ?? current.audience,
    });
    if (!draft) return fail(409, "This broadcast uses a template that no longer exists.");

    // Only while it's still a draft (another admin may have sent it meanwhile)
    const updated = await Broadcast.findOneAndUpdate(
      { _id: current._id, status: "draft" },
      {
        $set: {
          name: draft.name,
          kind: draft.kind,
          fields: draft.fields,
          subject: draft.subject,
          audience: draft.audience,
          updatedBy: { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName },
        },
      },
      { returnDocument: "after" },
    ).lean<IBroadcast>();
    if (!updated) return fail(409, "Only drafts can be edited.");
    return NextResponse.json({ broadcast: toBroadcastDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/broadcasts/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "mail.broadcast");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");
    const Broadcast = await getBroadcastModel();
    const result = await Broadcast.deleteOne({ _id: id, status: "draft" });
    if (result.deletedCount === 0) {
      return (await Broadcast.exists({ _id: id }))
        ? fail(409, "Only drafts can be deleted.")
        : fail(404, "Broadcast not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/broadcasts/[id]");
  }
}
