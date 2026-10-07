// src/lib/models/platformDriveConnectionModel.ts
// The Google account behind the platform Drive inbox (lib/drive/inbox.ts):
// one document, key "inbox". People share PDFs with this account; the
// daily check imports them into the staff queue. The refresh token is
// encrypted (lib/encryption.ts) and only ever used server side.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface InboxCheckSummary {
  at: Date;
  /** PDFs found shared with the account (files and inside shared folders) */
  found: number;
  imported: number;
  duplicate: number;
  failed: number;
  /** Not reached before the time budget ran out; next run picks them up */
  remaining: number;
  /** Set when the check itself failed (token revoked, Drive down) */
  error?: string;
}

export interface IPlatformDriveConnection {
  _id: Types.ObjectId;
  key: "inbox";
  accountEmail: string;
  refreshToken: string; // encrypted
  connectedBy: { userId: Types.ObjectId; upid: string };
  connectedAt: Date;
  status: "ok" | "broken";
  lastError?: string;
  lastCheck?: InboxCheckSummary;
  /** A check in progress holds this so two can't run at once */
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SummarySchema = new Schema<InboxCheckSummary>(
  {
    at: { type: Date, required: true },
    found: Number,
    imported: Number,
    duplicate: Number,
    failed: Number,
    remaining: Number,
    error: String,
  },
  { _id: false },
);

const PlatformDriveConnectionSchema = new Schema<IPlatformDriveConnection>(
  {
    key: { type: String, enum: ["inbox"], required: true, unique: true },
    accountEmail: { type: String, required: true },
    refreshToken: { type: String, required: true },
    connectedBy: {
      type: new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, upid: { type: String, required: true } }, { _id: false }),
      required: true,
    },
    connectedAt: { type: Date, required: true },
    status: { type: String, enum: ["ok", "broken"], default: "ok" },
    lastError: { type: String },
    lastCheck: { type: SummarySchema, default: undefined },
    lockUntil: { type: Date },
  },
  { timestamps: true },
);

export async function getPlatformDriveConnectionModel(): Promise<Model<IPlatformDriveConnection>> {
  const conn = await connectDB();
  return (conn.models.PlatformDriveConnection as Model<IPlatformDriveConnection> | undefined) ??
    conn.model<IPlatformDriveConnection>("PlatformDriveConnection", PlatformDriveConnectionSchema);
}
