// src/lib/comments.ts
// Server helpers for material comments.
import { Types, isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { can } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/roles";
import type { CommentDto } from "@/types/comments";

// Who upvoted / reported what: one Redis set of comment ids per user. SADD
// and SREM answer atomically whether anything changed, and a page of
// comments is checked in a single SMISMEMBER.
export const upvotesKey = (userId: string) => `comment_upvotes:${userId}`;
export const reportsKey = (userId: string) => `comment_reports:${userId}`;

export const DELETED_TEXT = "[deleted]";
export const REMOVED_TEXT = "[removed by moderator]";

/**
 * Soft-deletes a comment: wipes the text and author but keeps the document,
 * so its replies keep their thread. Only the call that actually flips it to
 * deleted moves the material's commentCount and the parent's replyCount, so
 * a repeated or concurrent delete can't count twice. Returns the deleted
 * comment, or null if it was already deleted.
 */
export async function softDeleteComment(
  comment: Pick<IComment, "_id" | "materialId" | "parentId">,
  deletedBy: string,
  placeholder: string = DELETED_TEXT,
): Promise<IComment | null> {
  const Comment = await getCommentModel();
  const deleted = await Comment.findOneAndUpdate(
    { _id: comment._id, isDeleted: false },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        text: placeholder,
        authorName: placeholder === DELETED_TEXT ? DELETED_TEXT : "[removed]",
        // A moderator's decision also closes the report
        isReported: false,
      },
      $unset: { authorProfilePhoto: "" },
    },
    { returnDocument: "after" },
  ).lean<IComment>();

  if (deleted) {
    const Material = await getMaterialModel();
    await Promise.all([
      Material.updateOne({ _id: comment.materialId }, { $inc: { commentCount: -1 } }, { timestamps: false }),
      comment.parentId
        ? Comment.updateOne({ _id: comment.parentId }, { $inc: { replyCount: -1 } }, { timestamps: false })
        : null,
    ]);
  }
  return deleted;
}

/** User admins (com_admin, webmaster, dev) can remove anyone's comment. */
export const canModerateComments = (role: UserRole) => can(role, "manage_users");

/** The material's id if it exists and is active (comments follow visibility). */
export async function findActiveMaterialId(id: string): Promise<Types.ObjectId | null> {
  if (!isValidObjectId(id)) return null;
  const Material = await getMaterialModel();
  const material = await Material.findOne({ _id: id, isActive: true }).select("_id").lean();
  return material?._id ?? null;
}

/** A comment that belongs to `materialId`, or null. */
export async function findCommentOf(materialId: string, commentId: string): Promise<IComment | null> {
  if (!isValidObjectId(materialId) || !isValidObjectId(commentId)) return null;
  const Comment = await getCommentModel();
  return Comment.findOne({ _id: commentId, materialId }).lean<IComment>();
}

export function toCommentDto(c: IComment, upvoted?: Set<string>): CommentDto {
  const id = String(c._id);
  return {
    id,
    parentId: c.parentId ? String(c.parentId) : null,
    depth: c.depth ?? 0,
    author: c.isDeleted
      ? null
      : { upid: c.authorUpid, name: c.authorName, profilePhoto: c.authorProfilePhoto || undefined },
    // Deleted text is already the placeholder ("[deleted]" or the moderator one)
    text: c.isDeleted ? c.text || DELETED_TEXT : c.text,
    isDeleted: !!c.isDeleted,
    upvoteCount: c.upvoteCount ?? 0,
    ...(upvoted ? { upvotedByMe: upvoted.has(id) } : {}),
    replyCount: c.replyCount ?? 0,
    createdAt: new Date(c.createdAt).toISOString(),
    ...(c.editedAt ? { editedAt: new Date(c.editedAt).toISOString() } : {}),
  };
}
