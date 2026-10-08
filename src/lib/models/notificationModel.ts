// src/lib/models/notificationModel.ts
// An in-app notification (the navbar bell and /notifications). Written by
// lib/notifications.ts only; types and their wording live there. Deleted
// 90 days after it was created, read or not.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notificationTypes";

export const NOTIFICATION_TTL_DAYS = 90;

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User
  type: NotificationType;
  title: string;
  body?: string;
  // A path on the site ("/materials/<id>"), never an outside URL
  link?: string;
  // Makes repeats a no-op, e.g. "badge:pdf_detective" (unique per user)
  dedupeKey?: string;
  readAt?: Date;
  createdAt: Date;
}

export type INotificationModel = Model<INotification>;

const NotificationSchema = new Schema<INotification, INotificationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 500 },
    link: { type: String, maxlength: 300 },
    dedupeKey: { type: String, maxlength: 200 },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// The list, newest first (also the cursor)
NotificationSchema.index({ userId: 1, _id: -1 });
// The unread count
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 });

export async function getNotificationModel(): Promise<INotificationModel> {
  const conn = await connectDB();
  return (
    (conn.models.Notification as INotificationModel | undefined) ??
    conn.model<INotification, INotificationModel>("Notification", NotificationSchema)
  );
}
