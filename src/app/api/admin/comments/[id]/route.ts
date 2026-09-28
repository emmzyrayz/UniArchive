// PATCH /api/admin/comments/[id]
// Decide a reported comment. Permission: "admin.view_submissions".
// Body: { action: "dismiss" | "delete" }
//   dismiss: reviewed and fine; clears the flag and the report count
//   delete:  breaks the guidelines; soft-deleted as "[removed by moderator]"
//            (same helper as the user-facing delete, so counts stay right)
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { REMOVED_TEXT, softDeleteComment } from "@/lib/comments";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "admin.view_submissions");
    await enforceRateLimit(request, "admin", `admin-comments:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Comment not found.");

    const body = await readJson(request);
    const action = body?.action;
    if (action !== "dismiss" && action !== "delete") {
      return fail(400, 'action must be "dismiss" or "delete".');
    }

    const Comment = await getCommentModel();
    const comment = await Comment.findById(id)
      .select("materialId parentId authorUpid isDeleted")
      .lean<Pick<IComment, "_id" | "materialId" | "parentId" | "authorUpid" | "isDeleted">>();
    if (!comment) return fail(404, "Comment not found.");

    if (action === "dismiss") {
      await Comment.updateOne(
        { _id: comment._id },
        { $set: { isReported: false, reportCount: 0 } },
        { timestamps: false },
      );
      console.info(`moderation: @${session.upid} dismissed reports on comment ${id}`);
    } else {
      const deleted = await softDeleteComment(comment, session.userId, REMOVED_TEXT);
      if (deleted) {
        console.info(`moderation: @${session.upid} removed comment ${id} by @${comment.authorUpid}`);
      }
    }

    const updated = await Comment.findById(id)
      .select("text reportCount isReported isDeleted")
      .lean<Pick<IComment, "text" | "reportCount" | "isReported" | "isDeleted">>();
    return NextResponse.json({
      success: true,
      comment: {
        id,
        text: updated?.text ?? "",
        reportCount: updated?.reportCount ?? 0,
        isReported: !!updated?.isReported,
        isDeleted: !!updated?.isDeleted,
      },
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/comments/[id]");
  }
}
