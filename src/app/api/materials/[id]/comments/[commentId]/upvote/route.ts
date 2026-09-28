// GET  /api/materials/[id]/comments/[commentId]/upvote - { upvoted }
// POST /api/materials/[id]/comments/[commentId]/upvote - toggle your upvote
//   Not on your own comment, or a deleted one.
//
// Who upvoted what is a Redis set per user (lib/comments.ts). SADD / SREM
// report atomically whether anything changed, so the count only moves when
// the set did: double clicks can't count twice. No expiry, so an old upvote
// can't be repeated later.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { redis } from "@/lib/redis";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { findCommentOf, upvotesKey } from "@/lib/comments";
import { awardBadgesAfter } from "@/lib/badges";

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id, commentId } = await context.params;
    const comment = await findCommentOf(id, commentId);
    if (!comment) return fail(404, "Comment not found.");
    const upvoted = (await redis.sismember(upvotesKey(session.userId), commentId)) === 1;
    return NextResponse.json({ upvoted }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/comments/[commentId]/upvote");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `comment-upvote:${session.userId}`);
    const { id, commentId } = await context.params;

    const comment = await findCommentOf(id, commentId);
    if (!comment || comment.isDeleted) return fail(404, "Comment not found.");
    if (String(comment.authorId) === session.userId) {
      return fail(403, "You can't upvote your own comment.");
    }

    const key = upvotesKey(session.userId);
    const Comment = await getCommentModel();
    let upvoted: boolean;
    if ((await redis.sadd(key, commentId)) === 1) {
      upvoted = true;
      await Comment.updateOne({ _id: comment._id }, { $inc: { upvoteCount: 1 } }, { timestamps: false });
      awardBadgesAfter(comment.authorId, "comment_upvoted");
    } else {
      // Already upvoted: this click takes it back
      upvoted = false;
      if ((await redis.srem(key, commentId)) === 1) {
        await Comment.updateOne(
          { _id: comment._id, upvoteCount: { $gt: 0 } },
          { $inc: { upvoteCount: -1 } },
          { timestamps: false },
        );
      }
    }

    const fresh = await Comment.findById(comment._id).select("upvoteCount").lean<Pick<IComment, "upvoteCount">>();
    return NextResponse.json({
      action: upvoted ? "added" : "removed",
      upvoted,
      upvoteCount: fresh?.upvoteCount ?? 0,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/comments/[commentId]/upvote");
  }
}
