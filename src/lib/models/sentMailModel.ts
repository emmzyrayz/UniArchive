// src/lib/models/sentMailModel.ts
// A message an admin wrote to one user in /admin/mail, sent through ZeptoMail
// (broadcasts are Brevo's and are recorded separately). The recipient's
// address is stored masked only; the full message is kept so admins can see
// what was said. Deleted a year after sending.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const SENT_MAIL_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface ISentMail {
  _id: Types.ObjectId;
  toUserId: Types.ObjectId;
  toUpid: string;
  toName: string;
  toEmailMasked: string;
  sentBy: Types.ObjectId;
  sentByUpid: string;
  sentByName: string;
  subject: string;
  body: string;
  status: "sending" | "sent" | "failed";
  providerMessageId?: string;
  error?: string;
  // The client's Idempotency-Key: a retried request never sends twice
  requestKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ISentMailModel = Model<ISentMail>;

const SentMailSchema = new Schema<ISentMail, ISentMailModel>(
  {
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUpid: { type: String, required: true },
    toName: { type: String, required: true },
    toEmailMasked: { type: String, required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sentByUpid: { type: String, required: true },
    sentByName: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
    providerMessageId: { type: String },
    error: { type: String },
    requestKey: { type: String, required: true },
  },
  { timestamps: true },
);

SentMailSchema.index({ sentBy: 1, requestKey: 1 }, { unique: true });
SentMailSchema.index({ toUserId: 1, createdAt: -1 });
SentMailSchema.index({ createdAt: 1 }, { expireAfterSeconds: SENT_MAIL_TTL_SECONDS, name: "sent_mail_ttl" });

export async function getSentMailModel(): Promise<ISentMailModel> {
  const conn = await connectDB();
  return (
    (conn.models.SentMail as ISentMailModel | undefined) ??
    conn.model<ISentMail, ISentMailModel>("SentMail", SentMailSchema)
  );
}
