// src/lib/broadcast/send.ts
// Sends (or schedules) a broadcast through Brevo, cancels a scheduled one,
// and refreshes Brevo's numbers.
//
// Send: the draft is claimed (draft -> sending) so two clicks can't send it
// twice; the audience is resolved with the same resolver as the preview and
// must still be the count the admin confirmed; then in Brevo: our contact
// attributes exist, a list is made for this broadcast, the audience is
// imported into it with fresh attributes (name, school, level, role, their
// /email-preferences link), the import is awaited, and the campaign is
// created from updates@ and sent now or left scheduled with Brevo.
//
// Failure before Brevo was asked to send -> back to draft with the error
// (safe to retry). Failure at or after that point -> "failed": it may have
// gone out, so it's never retried blindly.
import { Types } from "mongoose";
import { getBroadcastModel, type IBroadcast } from "@/lib/models/broadcastModel";
import { getUserModel } from "@/lib/models/userModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { emailPrefsUrl } from "@/lib/emailPrefs";
import { SUPPORT_EMAIL } from "@/lib/site";
import {
  BrevoError,
  broadcastFolderId,
  cancelCampaign,
  createContactList,
  createEmailCampaign,
  ensureContactAttributes,
  getCampaignStats,
  importContacts,
  sendCampaignNow,
  unblockBrevoContact,
  waitForProcess,
  type BrevoContact,
} from "@/lib/brevo";
import { cleanFields, getTemplate, renderBroadcast } from "./templates";
import { cleanAudience } from "./audience";
import { resolveRecipients, type RecipientDoc } from "./recipients";

const IMPORT_BATCH = 5000;
const IMPORT_WAIT_MS = 40_000;
export const SCHEDULE_LIMITS = { minMinutes: 10, maxDays: 90 } as const;
// Brevo's numbers are re-fetched at most this often unless forced
const STATS_MAX_AGE_MS = 5 * 60 * 1000;

export class SendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

interface Sender {
  userId: string;
  upid: string;
  name: string;
}

function brevoSender(): { name: string; email: string } {
  return {
    name: process.env.BREVO_SENDER_NAME?.trim() || "UniArchive",
    email: process.env.BREVO_SENDER_EMAIL?.trim() || "updates@uniarchive.com.ng",
  };
}

function toContact(r: RecipientDoc): BrevoContact | null {
  let email: string;
  try {
    email = decryptSensitiveData(r.email);
  } catch {
    return null;
  }
  const school = r.universityName || r.school || "";
  return {
    email,
    attributes: {
      FIRSTNAME: r.firstName || r.fullName.split(/\s+/)[0] || "",
      LASTNAME: r.lastName || "",
      UPID: r.upid,
      SCHOOL: school,
      LEVEL: r.level || "",
      ROLE: r.role,
      PREFS_URL: emailPrefsUrl(r),
    },
  };
}

/** Checks a requested schedule time; null = send now. */
export function parseSchedule(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new SendError("Pick a valid date and time.", 400);
  const now = Date.now();
  if (date.getTime() < now + SCHEDULE_LIMITS.minMinutes * 60_000) {
    throw new SendError(`Schedule it at least ${SCHEDULE_LIMITS.minMinutes} minutes from now.`, 400);
  }
  if (date.getTime() > now + SCHEDULE_LIMITS.maxDays * 24 * 60 * 60_000) {
    throw new SendError(`Schedule it within ${SCHEDULE_LIMITS.maxDays} days.`, 400);
  }
  return date;
}

export async function sendBroadcast(
  id: string,
  options: { confirmCount: number; scheduledAt: Date | null; by: Sender },
): Promise<IBroadcast> {
  const Broadcast = await getBroadcastModel();
  const current = await Broadcast.findById(id).lean<IBroadcast>();
  if (!current) throw new SendError("Broadcast not found.", 404);
  if (current.status !== "draft") throw new SendError(`This broadcast is already ${current.status}.`, 409);

  const template = getTemplate(current.templateId);
  if (!template) throw new SendError("This broadcast uses a template that no longer exists.", 409);
  const { fields, problems } = cleanFields(template, current.fields);
  const { audience, problems: audienceProblems } = cleanAudience(current.audience);
  if (problems.length || audienceProblems.length) {
    throw new SendError(`Finish the broadcast first: ${[...problems, ...audienceProblems].join(" ")}`, 400);
  }

  const recipients = await resolveRecipients(audience, current.kind);
  if (recipients.length === 0) throw new SendError("Nobody matches this audience.", 400);
  if (recipients.length !== options.confirmCount) {
    throw new SendError(
      `The audience changed: it's now ${recipients.length.toLocaleString()} people, not ${options.confirmCount.toLocaleString()}. Check and confirm again.`,
      409,
      { total: recipients.length },
    );
  }

  const by = { userId: new Types.ObjectId(options.by.userId), upid: options.by.upid, name: options.by.name };
  // Claim it: only one send can move it out of draft
  const claimed = await Broadcast.findOneAndUpdate(
    { _id: current._id, status: "draft" },
    { $set: { status: "sending", sentBy: by, recipientCount: recipients.length }, $unset: { error: 1 } },
    { returnDocument: "after" },
  ).lean<IBroadcast>();
  if (!claimed) throw new SendError("Someone else is already sending this broadcast.", 409);

  let askedBrevoToSend = false;
  let brevoListId: number | undefined;
  let brevoCampaignId: number | undefined;
  try {
    await ensureContactAttributes();

    // Anyone Brevo still blocks but who opted back in (the unblock failed earlier)
    const User = await getUserModel();
    for (const r of recipients.filter((r) => r.emailPrefs?.brevoBlocked)) {
      try {
        await unblockBrevoContact(decryptSensitiveData(r.email));
        await User.updateOne({ _id: r._id }, { $set: { "emailPrefs.brevoBlocked": false } });
      } catch (error) {
        console.error(`[broadcast] couldn't unblock ${r.upid}:`, error);
      }
    }

    const contacts = recipients.map(toContact).filter((c): c is BrevoContact => c !== null);
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    brevoListId = await createContactList(`UA broadcast ${current._id} (${stamp})`, await broadcastFolderId());
    for (let i = 0; i < contacts.length; i += IMPORT_BATCH) {
      const processId = await importContacts(brevoListId, contacts.slice(i, i + IMPORT_BATCH));
      if ((await waitForProcess(processId, IMPORT_WAIT_MS)) === "timeout") {
        throw new BrevoError("Brevo is still importing the contacts. Try again in a minute.", 504);
      }
    }

    const rendered = renderBroadcast(template, fields, current.kind);
    brevoCampaignId = await createEmailCampaign({
      name: `${current.name} [${current._id}]`,
      subject: rendered.subject,
      sender: brevoSender(),
      replyTo: SUPPORT_EMAIL,
      htmlContent: rendered.html,
      listId: brevoListId,
      ...(options.scheduledAt && { scheduledAt: options.scheduledAt }),
    });
    if (options.scheduledAt) askedBrevoToSend = true;
    else {
      askedBrevoToSend = true;
      await sendCampaignNow(brevoCampaignId);
    }

    const done = await Broadcast.findByIdAndUpdate(
      current._id,
      {
        $set: {
          brevoListId,
          brevoCampaignId,
          subject: rendered.subject,
          ...(options.scheduledAt
            ? { status: "scheduled", scheduledAt: options.scheduledAt }
            : { status: "sent", sentAt: new Date() }),
        },
      },
      { returnDocument: "after" },
    ).lean<IBroadcast>();
    console.info(
      `[broadcast] ${current._id} ${options.scheduledAt ? `scheduled for ${options.scheduledAt.toISOString()}` : "sent"} ` +
        `to ${contacts.length} by @${options.by.upid} (Brevo campaign ${brevoCampaignId})`,
    );
    return done!;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    console.error(`[broadcast] ${current._id} send failed:`, error);
    await Broadcast.updateOne(
      { _id: current._id },
      askedBrevoToSend
        ? { $set: { status: "failed", error: message, ...(brevoListId && { brevoListId }), ...(brevoCampaignId && { brevoCampaignId }) } }
        : { $set: { status: "draft", error: message }, $unset: { sentBy: 1, recipientCount: 1 } },
    );
    throw new SendError(
      askedBrevoToSend
        ? `Brevo reported a problem after it was asked to send, so it may have gone out. Check Brevo before trying again. (${message})`
        : `Brevo didn't accept the broadcast; nothing was sent and it's back to a draft. (${message})`,
      502,
    );
  }
}

/** Stops a scheduled broadcast in Brevo and marks it cancelled. */
export async function cancelBroadcast(id: string): Promise<IBroadcast> {
  const Broadcast = await getBroadcastModel();
  const current = await Broadcast.findById(id).lean<IBroadcast>();
  if (!current) throw new SendError("Broadcast not found.", 404);
  if (current.status !== "scheduled" || !current.brevoCampaignId) {
    throw new SendError("Only a scheduled broadcast can be cancelled.", 409);
  }
  if (current.scheduledAt && current.scheduledAt.getTime() <= Date.now()) {
    throw new SendError("Its send time has passed; it may already be going out.", 409);
  }
  try {
    await cancelCampaign(current.brevoCampaignId);
  } catch (error) {
    throw new SendError(`Brevo couldn't cancel it: ${error instanceof Error ? error.message : error}`, 502);
  }
  const updated = await Broadcast.findOneAndUpdate(
    { _id: current._id, status: "scheduled" },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" },
  ).lean<IBroadcast>();
  return updated ?? current;
}

/**
 * Pulls Brevo's numbers (and notices a scheduled broadcast that has gone
 * out). Cached STATS_MAX_AGE_MS unless forced.
 */
export async function refreshBroadcastStats(id: string, force: boolean): Promise<IBroadcast> {
  const Broadcast = await getBroadcastModel();
  const current = await Broadcast.findById(id).lean<IBroadcast>();
  if (!current) throw new SendError("Broadcast not found.", 404);
  if (!current.brevoCampaignId || !["sent", "scheduled", "failed"].includes(current.status)) return current;
  const age = current.stats?.updatedAt ? Date.now() - new Date(current.stats.updatedAt).getTime() : Infinity;
  if (!force && age < STATS_MAX_AGE_MS) return current;

  const brevo = await getCampaignStats(current.brevoCampaignId);
  const set: Record<string, unknown> = { stats: { ...brevo.stats, updatedAt: new Date() } };
  if (current.status === "scheduled" && brevo.status === "sent") {
    set.status = "sent";
    set.sentAt = brevo.sentDate ? new Date(brevo.sentDate) : current.scheduledAt ?? new Date();
  }
  if (current.status === "scheduled" && (brevo.status === "cancelled" || brevo.status === "suspended")) {
    set.status = "cancelled";
  }
  return (await Broadcast.findByIdAndUpdate(current._id, { $set: set }, { returnDocument: "after" }).lean<IBroadcast>())!;
}
