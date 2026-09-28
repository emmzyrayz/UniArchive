// src/lib/models/userBadgeModel.ts
// A badge a user has earned. The badge itself (name, emoji, rarity) is
// defined in code (src/lib/constants/badges.ts); this only records who got
// which, when, and whether they've been shown the "unlocked" toast.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { BADGE_IDS, type BadgeId } from "@/lib/constants/badges";

export interface IUserBadge {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User
  userUpid: string;
  badgeId: BadgeId;
  awardedAt: Date;
  // What triggered it (for audit), e.g. "material_verified"
  awardedFor?: string;
  // Whether the user has been notified
  seen: boolean;
}

export type IUserBadgeModel = Model<IUserBadge>;

const UserBadgeSchema = new Schema<IUserBadge, IUserBadgeModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    badgeId: { type: String, enum: BADGE_IDS, required: true },
    awardedAt: { type: Date, default: Date.now },
    awardedFor: { type: String },
    seen: { type: Boolean, default: false },
  },
  { versionKey: false },
);

// One of each badge per user: the engine relies on this never to double-award
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
// Unseen badges, for the toast
UserBadgeSchema.index({ userId: 1, seen: 1 });
// Leaderboards / "who else has this"
UserBadgeSchema.index({ badgeId: 1, awardedAt: 1 });

export async function getUserBadgeModel(): Promise<IUserBadgeModel> {
  const conn = await connectDB();
  return (
    (conn.models.UserBadge as IUserBadgeModel | undefined) ??
    conn.model<IUserBadge, IUserBadgeModel>("UserBadge", UserBadgeSchema)
  );
}
