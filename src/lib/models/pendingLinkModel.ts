// src/lib/models/pendingLinkModel.ts
// A Google account waiting to be linked to an existing email/password
// account. Created by /api/auth/social-callback, confirmed with the emailed
// code at /api/auth/link-account. The browser that started the Google sign-in
// holds the raw link token in the httpOnly `ua_link` cookie; only its hash is
// stored here, so the code is useless from any other browser.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const LINK_OTP_TTL_MS = 10 * 60 * 1000;
export const LINK_MAX_ATTEMPTS = 3;
export const LINK_MAX_RESENDS = 3;
// Documents are deleted this long after creation
export const PENDING_LINK_TTL_SECONDS = 15 * 60;

export interface IPendingLink {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // the existing account; ref: User
  maskedEmail: string; // "use***@gmail.com", for display only
  linkTokenHash: string;

  // The Google identity to link
  googleId: string;
  googleEmail: string;
  googleName: string;
  googlePhoto?: string;

  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  resendCount: number;
  used: boolean;
  // Where to send the user once linked (already checked as a same-site path)
  returnTo: string;

  createdAt: Date;
}

export type IPendingLinkModel = Model<IPendingLink>;

const PendingLinkSchema = new Schema<IPendingLink, IPendingLinkModel>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  maskedEmail: { type: String, required: true },
  linkTokenHash: { type: String, required: true, unique: true },
  googleId: { type: String, required: true },
  googleEmail: { type: String, required: true },
  googleName: { type: String, default: "" },
  googlePhoto: { type: String },
  otpHash: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  returnTo: { type: String, default: "/home" },
  createdAt: { type: Date, default: Date.now },
});

PendingLinkSchema.index({ createdAt: 1 }, { expireAfterSeconds: PENDING_LINK_TTL_SECONDS });
PendingLinkSchema.index({ userId: 1 });

export async function getPendingLinkModel(): Promise<IPendingLinkModel> {
  const conn = await connectDB();
  return (
    (conn.models.PendingLink as IPendingLinkModel | undefined) ??
    conn.model<IPendingLink, IPendingLinkModel>("PendingLink", PendingLinkSchema)
  );
}
