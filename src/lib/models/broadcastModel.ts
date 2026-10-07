// src/lib/models/broadcastModel.ts
// A bulk email composed in /admin/mail/broadcasts and sent through Brevo.
// Stores the template and its field values (not the rendered HTML), so a
// draft reopens exactly as it was left; the HTML is rendered from them by
// lib/broadcast/templates.ts at test and send time.
//
// Status: draft -> (scheduled ->) sending -> sent, or failed / cancelled.
// Only drafts can be edited or deleted.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { BroadcastTemplateId, TemplateFields } from "@/lib/broadcast/templates";
import type { BroadcastAudience } from "@/lib/broadcast/audience";
import type { EmailKind } from "@/lib/emailPrefs";

export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

interface StaffRef {
  userId: Types.ObjectId;
  upid: string;
  name: string;
}

export interface IBroadcast {
  _id: Types.ObjectId;
  /** Internal name, shown only in the admin list */
  name: string;
  templateId: BroadcastTemplateId;
  kind: EmailKind;
  fields: TemplateFields;
  /** The rendered subject, kept for lists */
  subject: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  createdBy: StaffRef;
  updatedBy: StaffRef;
  lastTestAt?: Date;

  // Set when sent or scheduled (commit 3: Brevo)
  recipientCount?: number;
  scheduledAt?: Date;
  sentAt?: Date;
  sentBy?: StaffRef;
  brevoCampaignId?: number;
  brevoListId?: number;
  /** When lib/broadcast/tidyLists.ts deleted that list from Brevo */
  brevoListDeletedAt?: Date;
  error?: string;
  stats?: {
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    updatedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type IBroadcastModel = Model<IBroadcast>;

const StaffRefSchema = new Schema<StaffRef>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    upid: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const BroadcastSchema = new Schema<IBroadcast, IBroadcastModel>(
  {
    name: { type: String, required: true, maxlength: 120 },
    templateId: { type: String, required: true },
    kind: { type: String, enum: ["announcements", "newsletter"], required: true },
    fields: { type: Schema.Types.Mixed, default: {} },
    subject: { type: String, default: "" },
    audience: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "failed", "cancelled"],
      default: "draft",
    },
    createdBy: { type: StaffRefSchema, required: true },
    updatedBy: { type: StaffRefSchema, required: true },
    lastTestAt: { type: Date },
    recipientCount: { type: Number },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    sentBy: { type: StaffRefSchema },
    brevoCampaignId: { type: Number },
    brevoListId: { type: Number },
    brevoListDeletedAt: { type: Date },
    error: { type: String },
    stats: {
      delivered: Number,
      opened: Number,
      clicked: Number,
      unsubscribed: Number,
      bounced: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true, minimize: false },
);

BroadcastSchema.index({ status: 1, updatedAt: -1 });

export async function getBroadcastModel(): Promise<IBroadcastModel> {
  const conn = await connectDB();
  return (
    (conn.models.Broadcast as IBroadcastModel | undefined) ??
    conn.model<IBroadcast, IBroadcastModel>("Broadcast", BroadcastSchema)
  );
}
