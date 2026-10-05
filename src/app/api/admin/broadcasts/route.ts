// /api/admin/broadcasts: bulk email drafts and history (Brevo).
// Permission: "mail.broadcast" (com_admin, dev).
// GET   ?status=draft|scheduled|sent|all (default all), page, limit
//       ("sent" also lists sending/failed/cancelled)
// POST  { templateId, name?, kind?, fields?, audience? } -> a new draft
//       (201). Incomplete drafts are fine; `problems` lists what's missing.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getBroadcastModel, type BroadcastStatus, type IBroadcast } from "@/lib/models/broadcastModel";
import { cleanDraft, toBroadcastDto } from "@/lib/broadcast/drafts";
import { getTemplate, initialFields } from "@/lib/broadcast/templates";
import { EMPTY_AUDIENCE } from "@/lib/broadcast/audience";
import type { AdminBroadcastsResponse } from "@/types/admin";

const STATUS_GROUPS: Record<string, BroadcastStatus[] | null> = {
  all: null,
  draft: ["draft"],
  scheduled: ["scheduled"],
  sent: ["sending", "sent", "failed", "cancelled"],
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "mail.broadcast");
    const params = request.nextUrl.searchParams;
    const group = params.get("status") ?? "all";
    if (!(group in STATUS_GROUPS)) return fail(400, 'status must be "draft", "scheduled", "sent" or "all".');
    const statuses = STATUS_GROUPS[group];
    const { page, limit, skip } = pagination(params);
    const filter = statuses ? { status: { $in: statuses } } : {};

    const Broadcast = await getBroadcastModel();
    const [docs, total] = await Promise.all([
      Broadcast.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean<IBroadcast[]>(),
      Broadcast.countDocuments(filter),
    ]);
    const body: AdminBroadcastsResponse = {
      broadcasts: docs.map(toBroadcastDto),
      total,
      page,
      totalPages: totalPages(total, limit),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/broadcasts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    await enforceRateLimit(request, "admin", `broadcasts:${session.userId}`);
    const input = await readJson<Record<string, unknown>>(request);
    const template = getTemplate(input?.templateId);
    if (!template) return fail(400, "Pick a template.");

    const draft = await cleanDraft({
      templateId: template.id,
      name: input?.name,
      kind: input?.kind,
      fields: input?.fields ?? initialFields(template),
      audience: input?.audience ?? EMPTY_AUDIENCE,
    });
    if (!draft) return fail(400, "Pick a template.");

    const me = { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName };
    const Broadcast = await getBroadcastModel();
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
    return handleRouteError(error, "POST /api/admin/broadcasts");
  }
}
