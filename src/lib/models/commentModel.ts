// src/lib/models/commentModel.ts
// A comment on a UniLibrary material. Two levels only: top-level comments
// (depth 0) and replies to them (depth 1). Deletion is soft, so a deleted
// comment with replies keeps its thread together as "[deleted]".
//
// Upvote and report membership (who upvoted / reported what) lives in Redis
// sets; the counts here are for sorting and moderation.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { COMMENT_MAX_LENGTH } from "@/lib/constants/comments";

export interface IComment {
  _id: Types.ObjectId;
  materialId: Types.ObjectId; // ref: Material
  authorId: Types.ObjectId; // ref: User
  authorUpid: string;
  authorName: string; // denormalised at posting time
  authorProfilePhoto?: string;

  text: string;

  // Threading: no parentId means top-level
  parentId?: Types.ObjectId; // ref: Comment
  depth: 0 | 1;
  // Live (not deleted) replies, so a deleted comment that still has replies
  // stays listed and the UI knows how many more there are
  replyCount: number;

  upvoteCount: number;

  // Moderation
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  isReported: boolean; // reportCount reached the review threshold
  reportCount: number;

  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ICommentModel = Model<IComment>;

const CommentSchema = new Schema<IComment, ICommentModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorUpid: { type: String, required: true },
    authorName: { type: String, required: true },
    authorProfilePhoto: { type: String },

    text: { type: String, required: true, maxlength: COMMENT_MAX_LENGTH },

    parentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    depth: { type: Number, enum: [0, 1], default: 0 },
    replyCount: { type: Number, default: 0 },

    upvoteCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isReported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },

    editedAt: { type: Date },
  },
  { timestamps: true },
);

// Top-level comments of a material (parentId null), newest or top first
CommentSchema.index({ materialId: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ materialId: 1, parentId: 1, upvoteCount: -1, createdAt: -1 });
// Replies to a comment, oldest first
CommentSchema.index({ parentId: 1, createdAt: 1 });
// A user's comments
CommentSchema.index({ authorId: 1, createdAt: -1 });
// Moderation queue
CommentSchema.index({ isReported: 1, reportCount: -1 });

export async function getCommentModel(): Promise<ICommentModel> {
  const conn = await connectDB();
  return (
    (conn.models.Comment as ICommentModel | undefined) ??
    conn.model<IComment, ICommentModel>("Comment", CommentSchema)
  );
}
