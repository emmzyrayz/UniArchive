// POST /api/admin/broadcasts/[id]/duplicate
// A new draft with the same template, content and audience (e.g. to resend
// a failed one or reuse last month's). Permission: "mail.broadcast".
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getBroadcastModel, type IBroadcast } from "@/lib/models/broadcastModel";
import { NAME_MAX, cleanDraft, toBroadcastDto } from "@/lib/broadcast/drafts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `broadcasts:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");

    const Broadcast = await getBroadcastModel();
    const source = await Broadcast.findById(id).lean<IBroadcast>();
    if (!source) return fail(404, "Broadcast not found.");
    const draft = await cleanDraft({
      templateId: source.templateId,
      name: `Copy of ${source.name}`.slice(0, NAME_MAX),
      kind: source.kind,
      fields: source.fields,
      audience: source.audience,
    });
    if (!draft) return fail(409, "This broadcast uses a template that no longer exists.");

    const me = { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName };
    const created = await Broadcast.create({
      name: draft.name,
      templateId: draft.template.id,
      kind: draft.kind,
      fields: draft.fields,
      subject: draft.subject,
      audience: draft.audience,
      createdBy: me,
      updatedBy: me,
    });
    return NextResponse.json({ broadcast: toBroadcastDto(created.toObject()) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/broadcasts/[id]/duplicate");
  }
}
