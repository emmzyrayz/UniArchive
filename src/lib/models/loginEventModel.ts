// src/lib/models/loginEventModel.ts
// One row per successful sign-in, shown to the user as their login history
// in settings. Written by startSession (lib/auth/startSession.ts); MongoDB
// deletes rows after LOGIN_HISTORY_DAYS.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import type { DeviceType } from "@/lib/auth/loginContext";

export const LOGIN_HISTORY_DAYS = 90;

export type LoginMethod = "password" | "google";

export interface ILoginEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User
  sessionUuid: string; // SessionCache.uuid, to show whether it's still signed in
  method: LoginMethod;
  // Confirmed with an emailed code (new device, or linking Google)
  viaEmailCode: boolean;
  device: string;
  deviceType: DeviceType;
  ipAddress: string;
  location?: string;
  createdAt: Date;
}

export type ILoginEventModel = Model<ILoginEvent>;

const LoginEventSchema = new Schema<ILoginEvent, ILoginEventModel>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sessionUuid: { type: String, required: true },
  method: { type: String, enum: ["password", "google"], required: true },
  viaEmailCode: { type: Boolean, default: false },
  device: { type: String, required: true },
  deviceType: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
  ipAddress: { type: String, required: true },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
});

LoginEventSchema.index({ userId: 1, createdAt: -1 });
LoginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: LOGIN_HISTORY_DAYS * 24 * 60 * 60 });

export async function getLoginEventModel(): Promise<ILoginEventModel> {
  const conn = await connectDB();
  return (
    (conn.models.LoginEvent as ILoginEventModel | undefined) ??
    conn.model<ILoginEvent, ILoginEventModel>("LoginEvent", LoginEventSchema)
  );
}
