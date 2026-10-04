// /api/admin/mail: messages an admin writes to one user, sent through
// ZeptoMail (src/utils/email.ts). Permission: "mail.send_user" (com_admin,
// webmaster, dev).
//
// GET   the sent log, newest first. Optional toUserId; page, limit (max 50).
// POST  { userId, subject, body } with an Idempotency-Key header. A retried
//       request with the same key returns the first attempt instead of
//       sending again. 201 when sent, 502 when the provider refused it (the
//       attempt is still logged as failed).
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail, isDuplicateKey, pagination, totalPages } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getUserModel } from "@/lib/models/userModel";
import { getSentMailModel, type ISentMail } from "@/lib/models/sentMailModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { maskEmailAddress } from "@/lib/auth/tokens";
import { STAFF_MESSAGE_LIMITS, renderStaffMessage } from "@/lib/emailLayout";
import { sendStaffMessageEmail } from "@/utils/email";
import type { AdminSentMailDto, AdminSentMailResponse } from "@/types/admin";

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

type SentMailDoc = Omit<ISentMail, "requestKey" | "updatedAt" | "providerMessageId" | "sentBy">;

function toDto(m: SentMailDoc): AdminSentMailDto {
  return {
    id: String(m._id),
    to: { userId: String(m.toUserId), upid: m.toUpid, name: m.toName, email: m.toEmailMasked },
    sentBy: { upid: m.sentByUpid, name: m.sentByName },
    subject: m.subject,
    body: m.body,
    status: m.status,
    ...(m.error && { error: m.error }),
    createdAt: new Date(m.createdAt).toISOString(),
  };
}

const LIST_FIELDS = "toUserId toUpid toName toEmailMasked sentByUpid sentByName subject body status error createdAt";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "mail.send_user");
    const params = request.nextUrl.searchParams;
    const { page, limit, skip } = pagination(params);
    const filter: Record<string, unknown> = {};
    const toUserId = params.get("toUserId");
    if (toUserId) {
      if (!Types.ObjectId.isValid(toUserId)) return fail(400, "Unknown user.");
      filter.toUserId = new Types.ObjectId(toUserId);
    }

    const SentMail = await getSentMailModel();
    const [docs, total] = await Promise.all([
      SentMail.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).select(LIST_FIELDS).lean<SentMailDoc[]>(),
      SentMail.countDocuments(filter),
    ]);
    const body: AdminSentMailResponse = {
      mails: docs.map(toDto),
      total,
      page,
      totalPages: totalPages(total, limit),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/mail");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "mail.send_user");

    const requestKey = request.headers.get("idempotency-key") ?? "";
    if (!KEY_PATTERN.test(requestKey)) return fail(400, "Missing or malformed Idempotency-Key header.");

    const input = await readJson<{ userId: string; subject: string; body: string }>(request);
    const userId = typeof input?.userId === "string" ? input.userId : "";
    const subject = typeof input?.subject === "string" ? input.subject.replace(/\s+/g, " ").trim() : "";
    const body = typeof input?.body === "string" ? input.body.replace(/\r\n?/g, "\n").trim() : "";
    if (!Types.ObjectId.isValid(userId)) return fail(400, "Pick a recipient.");
    if (!subject || subject.length > STAFF_MESSAGE_LIMITS.subject) {
      return fail(400, `The subject must be 1-${STAFF_MESSAGE_LIMITS.subject} characters.`);
    }
    if (!body || body.length > STAFF_MESSAGE_LIMITS.body) {
      return fail(400, `The message must be 1-${STAFF_MESSAGE_LIMITS.body} characters.`);
    }

    const SentMail = await getSentMailModel();
    const senderId = new Types.ObjectId(session.userId);
    const replay = async () => {
      const previous = await SentMail.findOne({ sentBy: senderId, requestKey }).select(LIST_FIELDS).lean<SentMailDoc>();
      return previous && NextResponse.json({ mail: toDto(previous), replayed: true });
    };
    const earlier = await replay();
    if (earlier) return earlier;

    await enforceRateLimit(request, "staffMail", `staff-mail:${session.userId}`);

    const User = await getUserModel();
    const recipient = await User.findById(userId)
      .select("fullName upid email")
      .lean<{ _id: Types.ObjectId; fullName: string; upid: string; email: string }>();
    if (!recipient) return fail(404, "That user no longer exists.");

    let toEmail: string;
    try {
      toEmail = decryptSensitiveData(recipient.email);
    } catch {
      return fail(422, "This user's email address can't be read.");
    }

    let mail;
    try {
      mail = await SentMail.create({
        toUserId: recipient._id,
        toUpid: recipient.upid,
        toName: recipient.fullName,
        toEmailMasked: maskEmailAddress(toEmail),
        sentBy: senderId,
        sentByUpid: session.upid,
        sentByName: session.fullName,
        subject,
        body,
        requestKey,
      });
    } catch (error) {
      // The same request is already being handled
      if (isDuplicateKey(error)) return (await replay()) ?? fail(409, "This message is already being sent.");
      throw error;
    }

    const { html, text } = renderStaffMessage({
      recipientName: recipient.fullName,
      senderName: session.fullName,
      subject,
      body,
    });
    const result = await sendStaffMessageEmail({ toEmail, subject, html, text });
    if (result.ok) {
      mail.status = "sent";
      mail.providerMessageId = result.messageId;
    } else {
      mail.status = "failed";
      mail.error = result.error;
    }
    await mail.save();

    return NextResponse.json(
      { mail: toDto(mail.toObject()) },
      { status: result.ok ? 201 : 502 },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/mail");
  }
}
