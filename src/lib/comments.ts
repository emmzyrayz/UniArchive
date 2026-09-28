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
    text: c.isDeleted ? DELETED_TEXT : c.text,
    isDeleted: !!c.isDeleted,
    upvoteCount: c.upvoteCount ?? 0,
    ...(upvoted ? { upvotedByMe: upvoted.has(id) } : {}),
    replyCount: c.replyCount ?? 0,
    createdAt: new Date(c.createdAt).toISOString(),
    ...(c.editedAt ? { editedAt: new Date(c.editedAt).toISOString() } : {}),
  };
}
