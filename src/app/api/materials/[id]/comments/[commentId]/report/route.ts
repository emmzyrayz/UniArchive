// POST /api/materials/[id]/comments/[commentId]/report
// Report a comment for moderation: once per user per comment (a Redis set
// per user, like upvotes), not your own, not a deleted one. At 5 reports the
// comment is flagged (isReported) for an admin; nothing is removed
// automatically.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { redis } from "@/lib/redis";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { COMMENT_REPORT_THRESHOLD } from "@/lib/constants/comments";
import { findCommentOf, reportsKey } from "@/lib/comments";

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `comment-report:${session.userId}`);
    const { id, commentId } = await context.params;

    const comment = await findCommentOf(id, commentId);
    if (!comment || comment.isDeleted) return fail(404, "Comment not found.");
    if (String(comment.authorId) === session.userId) {
      return fail(403, "You can't report your own comment.");
    }

    // 0: this user already reported it; say so without counting it again
    if ((await redis.sadd(reportsKey(session.userId), commentId)) === 0) {
      return NextResponse.json({ reported: true, alreadyReported: true });
    }

    const Comment = await getCommentModel();
    const updated = await Comment.findByIdAndUpdate(
      comment._id,
      { $inc: { reportCount: 1 } },
      { returnDocument: "after", timestamps: false },
    )
      .select("reportCount isReported")
      .lean<Pick<IComment, "reportCount" | "isReported">>();
    if (updated && updated.reportCount >= COMMENT_REPORT_THRESHOLD && !updated.isReported) {
      await Comment.updateOne({ _id: comment._id }, { $set: { isReported: true } }, { timestamps: false });
      console.info(`moderation: comment ${commentId} flagged after ${updated.reportCount} reports`);
    }

    return NextResponse.json({ reported: true, alreadyReported: false });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/comments/[commentId]/report");
  }
}
