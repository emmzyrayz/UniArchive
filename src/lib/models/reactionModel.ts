// src/lib/models/reactionModel.ts
// One user's reaction to one UniLibrary material. At most one per user per
// material: reacting again with the same type removes it, a different type
// replaces it. Material.reactions holds the running totals.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { REACTION_TYPES, type ReactionType } from "@/lib/constants/reactions";

export type { ReactionType };

export interface IReaction {
  _id: Types.ObjectId;
  materialId: Types.ObjectId; // ref: Material
  userId: Types.ObjectId; // ref: User
  userUpid: string;
  reactionType: ReactionType;
  createdAt: Date;
  updatedAt: Date;
}

export type IReactionModel = Model<IReaction>;

const ReactionSchema = new Schema<IReaction, IReactionModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userUpid: { type: String, required: true },
    reactionType: { type: String, enum: REACTION_TYPES, required: true },
  },
  { timestamps: true },
);

// One reaction per user per material (also serves "this user's reactions to
// these materials", which leads with materialId + userId)
ReactionSchema.index({ materialId: 1, userId: 1 }, { unique: true });
ReactionSchema.index({ materialId: 1, reactionType: 1 });

export async function getReactionModel(): Promise<IReactionModel> {
  const conn = await connectDB();
  return (
    (conn.models.Reaction as IReactionModel | undefined) ??
    conn.model<IReaction, IReactionModel>("Reaction", ReactionSchema)
  );
}
