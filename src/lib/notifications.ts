// src/lib/notifications.ts
// In-app notifications: the one way server code tells a user something
// happened (the bell in the navbar and /notifications; later the phone
// app's push). notify() never throws: a notification is never worth
// failing the request that caused it. notifyAfter() sends it once the
// response is out, like awardBadgesAfter.
import { after } from "next/server";
import { Types } from "mongoose";
import { getNotificationModel, type INotification } from "@/lib/models/notificationModel";
import {
  NOTIFICATION_KINDS,
  isSafeNotificationLink,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notificationTypes";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  /** A path on the site; anything else is dropped. */
  link?: string;
  /** Sending the same key to the same user again does nothing. */
  dedupeKey?: string;
}

const clip = (text: string | undefined, max: number) =>
  text && text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** Saves a notification for the user. Returns whether one was created. */
export async function notify(userId: string | Types.ObjectId, input: NotifyInput): Promise<boolean> {
  try {
    if (!Types.ObjectId.isValid(String(userId))) return false;
    const Notification = await getNotificationModel();
    await Notification.create({
      userId: new Types.ObjectId(String(userId)),
      type: input.type,
      title: clip(input.title, 200),
      body: clip(input.body, 500),
      link: isSafeNotificationLink(input.link) ? input.link : undefined,
      dedupeKey: input.dedupeKey,
    });
    return true;
  } catch (error) {
    // Sent already (dedupeKey): that's the point of the key
    if ((error as { code?: number }).code !== 11000) {
      console.error(`[notifications] ${input.type} for ${String(userId)} failed:`, error);
    }
    return false;
  }
}

/** notify() after the response is sent (after() keeps it alive on serverless). */
export function notifyAfter(userId: string | Types.ObjectId, input: NotifyInput): void {
  after(() => notify(userId, input));
}

export function toNotificationItem(n: INotification): NotificationItem {
  return {
    id: String(n._id),
    type: n.type,
    icon: NOTIFICATION_KINDS[n.type]?.icon ?? "🔔",
    title: n.title,
    body: n.body,
    link: n.link,
    read: !!n.readAt,
    createdAt: new Date(n.createdAt).toISOString(),
  };
}

export const NOTIFICATION_PAGE_SIZE = 20;

/** A page of the user's notifications, newest first; `before` is the last id seen. */
export async function listNotifications(
  userId: string,
  before?: string,
  limit = NOTIFICATION_PAGE_SIZE,
): Promise<{ notifications: NotificationItem[]; nextCursor: string | null }> {
  const Notification = await getNotificationModel();
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (before && Types.ObjectId.isValid(before)) filter._id = { $lt: new Types.ObjectId(before) };
  const rows = await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean<INotification[]>();
  const page = rows.slice(0, limit);
  return {
    notifications: page.map(toNotificationItem),
    nextCursor: rows.length > limit ? String(page[page.length - 1]._id) : null,
  };
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const Notification = await getNotificationModel();
  return Notification.countDocuments({ userId: new Types.ObjectId(userId), readAt: { $exists: false } });
}

/** Marks some (or all) of the user's notifications read. Returns how many changed. */
export async function markNotificationsRead(userId: string, ids: string[] | "all"): Promise<number> {
  const Notification = await getNotificationModel();
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), readAt: { $exists: false } };
  if (ids !== "all") {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (valid.length === 0) return 0;
    filter._id = { $in: valid };
  }
  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return result.modifiedCount;
}
