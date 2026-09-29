// src/lib/models/trustedDeviceModel.ts
// A browser the user has confirmed with an emailed code. The raw device token
// lives in the httpOnly `ua_device` cookie; only its SHA-256 hash is stored.
// Each successful sign-in slides the 30-day expiry forward; MongoDB deletes
// the document once it passes.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface ITrustedDevice {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User
  tokenHash: string;
  deviceName: string; // "Chrome on Windows", for a future "Manage devices" page
  ipAddress?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export type ITrustedDeviceModel = Model<ITrustedDevice>;

const TrustedDeviceSchema = new Schema<ITrustedDevice, ITrustedDeviceModel>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true },
  deviceName: { type: String, required: true },
  ipAddress: { type: String },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

TrustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TrustedDeviceSchema.index({ userId: 1 });
TrustedDeviceSchema.index({ tokenHash: 1 }, { unique: true });

export async function getTrustedDeviceModel(): Promise<ITrustedDeviceModel> {
  const conn = await connectDB();
  return (
    (conn.models.TrustedDevice as ITrustedDeviceModel | undefined) ??
    conn.model<ITrustedDevice, ITrustedDeviceModel>("TrustedDevice", TrustedDeviceSchema)
  );
}
