// POST /api/admin/broadcasts/[id]/test
// Sends the saved draft to the signed-in admin only, with "[Test]" in the
// subject and their own name and preferences link filled in. Goes through
// ZeptoMail: one copy to one staff member is transactional, not bulk.
// The content must be complete (no field problems); the audience isn't
// checked. Permission: "mail.broadcast"; shares the 30/hour staff-mail limit.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getBroadcastModel, type IBroadcast } from "@/lib/models/broadcastModel";
import { getUserModel } from "@/lib/models/userModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { maskEmailAddress } from "@/lib/auth/tokens";
import { emailPrefsUrl } from "@/lib/emailPrefs";
import { cleanFields, getTemplate, personalize, renderBroadcast } from "@/lib/broadcast/templates";
import { sendStaffMessageEmail } from "@/utils/email";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "mail.broadcast");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Broadcast not found.");

    const Broadcast = await getBroadcastModel();
    const broadcast = await Broadcast.findById(id).lean<IBroadcast>();
    if (!broadcast) return fail(404, "Broadcast not found.");
    const template = getTemplate(broadcast.templateId);
    if (!template) return fail(409, "This broadcast uses a template that no longer exists.");
    const { fields, problems } = cleanFields(template, broadcast.fields);
    if (problems.length) return fail(400, `Finish the content first: ${problems.join(" ")}`);

    await enforceRateLimit(request, "staffMail", `staff-mail:${session.userId}`);

    const User = await getUserModel();
    const me = await User.findById(session.userId)
      .select("email firstName fullName upid")
      .lean<{ _id: Types.ObjectId; email: string; firstName?: string; fullName: string; upid: string }>();
    if (!me) return fail(404, "Your account wasn't found.");
    const toEmail = decryptSensitiveData(me.email);

    const prefsUrl = emailPrefsUrl(me);
    const rendered = personalize(renderBroadcast(template, fields, broadcast.kind), {
      firstName: me.firstName || me.fullName.split(/\s+/)[0] || "",
      prefsUrl,
      // The real unsubscribe link only exists in Brevo's copy
      unsubscribeUrl: prefsUrl,
    });
    const result = await sendStaffMessageEmail({
      toEmail,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    });
    if (!result.ok) return fail(502, `The email provider refused the test: ${result.error}`);

    await Broadcast.updateOne({ _id: broadcast._id }, { $set: { lastTestAt: new Date() } });
    return NextResponse.json({ ok: true, sentTo: maskEmailAddress(toEmail) });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/broadcasts/[id]/test");
  }
}
