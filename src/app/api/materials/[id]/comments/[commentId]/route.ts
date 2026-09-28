// PATCH  /api/materials/[id]/comments/[commentId] - edit your comment
//   Body: { text }. Author only, and only within 15 minutes of posting: the
//   update's own filter requires createdAt within the window, so the rule
//   holds however the request is timed. Sets editedAt.
// DELETE /api/materials/[id]/comments/[commentId] - soft delete
//   The author, or a user admin (com_admin, webmaster, dev) for anyone's.
//   The text and author are wiped but the comment stays, so its replies
//   keep their thread. Counts only move on the first delete.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { COMMENT_EDIT_WINDOW_MS, COMMENT_MAX_LENGTH } from "@/lib/constants/comments";
import {
  DELETED_TEXT,
  REMOVED_TEXT,
  canModerateComments,
  findCommentOf,
  softDeleteComment,
  toCommentDto,
} from "@/lib/comments";

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "comment", `comment-edit:${session.userId}`);
    const { id, commentId } = await context.params;

    const body = await readJson(request);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > COMMENT_MAX_LENGTH) {
      return fail(400, `A comment must be 1-${COMMENT_MAX_LENGTH} characters.`);
    }

    const comment = await findCommentOf(id, commentId);
    if (!comment) return fail(404, "Comment not found.");
    if (String(comment.authorId) !== session.userId) return fail(403, "You can only edit your own comments.");
    if (comment.isDeleted) return fail(409, "This comment was deleted.");

    const Comment = await getCommentModel();
    const updated = await Comment.findOneAndUpdate(
      {
        _id: comment._id,
        authorId: new Types.ObjectId(session.userId),
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - COMMENT_EDIT_WINDOW_MS) },
      },
      { $set: { text, editedAt: new Date() } },
      { returnDocument: "after" },
    ).lean<IComment>();
    if (!updated) {
      return fail(403, "Comments can only be edited within 15 minutes of posting.");
    }
    return NextResponse.json({ comment: toCommentDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/materials/[id]/comments/[commentId]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `comment-delete:${session.userId}`);
    const { id, commentId } = await context.params;

    const comment = await findCommentOf(id, commentId);
    if (!comment) return fail(404, "Comment not found.");
    const isAuthor = String(comment.authorId) === session.userId;
    if (!isAuthor && !canModerateComments(session.role)) {
      return fail(403, "You can only delete your own comments.");
    }

    const deleted = await softDeleteComment(
      comment,
      session.userId,
      isAuthor ? DELETED_TEXT : REMOVED_TEXT,
    );
    if (deleted && !isAuthor) {
      console.info(`moderation: @${session.upid} deleted comment ${commentId} by @${comment.authorUpid}`);
    }

    const current = deleted ?? (await findCommentOf(id, commentId));
    return NextResponse.json({ success: true, comment: current ? toCommentDto(current) : null });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/materials/[id]/comments/[commentId]");
  }
}
