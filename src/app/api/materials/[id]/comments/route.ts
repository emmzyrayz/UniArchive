// GET  /api/materials/[id]/comments - public
//   Top-level comments, each with its first few replies inline (oldest
//   first) and its total replyCount. sort: "newest" (default) or "top"
//   (upvotes). page, limit (default 20, max 50).
//   ?parentId=<commentId> lists every reply to that comment instead.
//   A deleted comment is only listed while it still has replies, so the
//   thread keeps its shape. Signed-in requests also get upvotedByMe.
// POST /api/materials/[id]/comments - sign-in required, 10 per minute
//   Body: { text, parentId? }. One level of replies: parentId must be a
//   live top-level comment on this material. Authors may comment on their
//   own materials (to answer questions about them).
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { getCurrentSessionUser, requireAuth } from "@/lib/auth/session";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { redis } from "@/lib/redis";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getUserModel } from "@/lib/models/userModel";
import { COMMENT_MAX_LENGTH, INLINE_REPLIES } from "@/lib/constants/comments";
import { findActiveMaterialId, toCommentDto, upvotesKey } from "@/lib/comments";
import type { CommentDto, CommentsResponse } from "@/types/comments";

type Context = { params: Promise<{ id: string }> };

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  top: { upvoteCount: -1, createdAt: -1, _id: -1 },
};

/** Which of these comments the viewer upvoted; undefined if unknown. */
async function upvotedBy(userId: string | undefined, ids: string[]): Promise<Set<string> | undefined> {
  if (!userId || ids.length === 0) return undefined;
  try {
    const flags = await redis.smismember(upvotesKey(userId), ids);
    return new Set(ids.filter((_, i) => flags[i] === 1));
  } catch (error) {
    console.error("comments: upvote lookup failed:", error);
    return undefined;
  }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `comments:${getClientIp(request)}`);
    const materialId = await findActiveMaterialId((await context.params).id);
    if (!materialId) return fail(404, "Material not found.");

    const params = request.nextUrl.searchParams;
    const sort = params.get("sort") ?? "newest";
    if (!SORTS[sort]) return fail(400, 'sort must be "newest" or "top".');
    const parentId = params.get("parentId");
    if (parentId && !isValidObjectId(parentId)) return fail(400, "parentId is not a valid id.");
    const { page, limit, skip } = pagination(params);

    const Comment = await getCommentModel();
    const viewer = await getCurrentSessionUser(request);

    // All replies to one comment
    if (parentId) {
      const filter = { materialId, parentId: new Types.ObjectId(parentId), isDeleted: false };
      const [replies, total] = await Promise.all([
        Comment.find(filter).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limit).lean<IComment[]>(),
        Comment.countDocuments(filter),
      ]);
      const upvoted = await upvotedBy(viewer?.userId, replies.map((r) => String(r._id)));
      const body: CommentsResponse = {
        comments: replies.map((r) => toCommentDto(r, upvoted)),
        total,
        page,
        totalPages: totalPages(total, limit),
        hasMore: skip + replies.length < total,
      };
      return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    }

    // Top-level comments; deleted ones only while they still hold replies
    const filter = {
      materialId,
      parentId: null,
      $or: [{ isDeleted: false }, { replyCount: { $gt: 0 } }],
    };
    const [comments, total] = await Promise.all([
      Comment.find(filter).sort(SORTS[sort]).skip(skip).limit(limit).lean<IComment[]>(),
      Comment.countDocuments(filter),
    ]);

    // The first few live replies of each, in one query
    const grouped = comments.length
      ? await Comment.aggregate<{ _id: Types.ObjectId; replies: IComment[] }>([
          { $match: { parentId: { $in: comments.map((c) => c._id) }, isDeleted: false } },
          { $sort: { createdAt: 1, _id: 1 } },
          { $group: { _id: "$parentId", replies: { $push: "$$ROOT" } } },
          { $project: { replies: { $slice: ["$replies", INLINE_REPLIES] } } },
        ])
      : [];
    const repliesByParent = new Map(grouped.map((g) => [String(g._id), g.replies]));

    const allIds = [
      ...comments.map((c) => String(c._id)),
      ...grouped.flatMap((g) => g.replies.map((r) => String(r._id))),
    ];
    const upvoted = await upvotedBy(viewer?.userId, allIds);

    const body: CommentsResponse = {
      comments: comments.map(
        (c): CommentDto => ({
          ...toCommentDto(c, upvoted),
          replies: (repliesByParent.get(String(c._id)) ?? []).map((r) => toCommentDto(r, upvoted)),
        }),
      ),
      total,
      page,
      totalPages: totalPages(total, limit),
      hasMore: skip + comments.length < total,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/comments");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "comment", `comment:${session.userId}`);
    const materialId = await findActiveMaterialId((await context.params).id);
    if (!materialId) return fail(404, "Material not found.");

    const body = await readJson(request);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > COMMENT_MAX_LENGTH) {
      return fail(400, `A comment must be 1-${COMMENT_MAX_LENGTH} characters.`);
    }

    const Comment = await getCommentModel();
    let parent: Pick<IComment, "_id" | "isDeleted" | "depth"> | null = null;
    if (body?.parentId !== undefined && body.parentId !== null) {
      if (typeof body.parentId !== "string" || !isValidObjectId(body.parentId)) {
        return fail(400, "parentId is not a valid id.");
      }
      parent = await Comment.findOne({ _id: body.parentId, materialId })
        .select("depth isDeleted")
        .lean<Pick<IComment, "_id" | "isDeleted" | "depth">>();
      if (!parent) return fail(404, "The comment you're replying to doesn't exist.");
      if (parent.depth !== 0) return fail(400, "You can only reply to top-level comments.");
      if (parent.isDeleted) return fail(409, "That comment was deleted.");
    }

    const User = await getUserModel();
    const author = await User.findById(session.userId).select("fullName profilePhoto").lean();

    const created = await Comment.create({
      materialId,
      authorId: session.userId,
      authorUpid: session.upid,
      authorName: author?.fullName ?? session.fullName,
      authorProfilePhoto: author?.profilePhoto || undefined,
      text,
      ...(parent ? { parentId: parent._id, depth: 1 } : { depth: 0 }),
    });

    const Material = await getMaterialModel();
    await Promise.all([
      Material.updateOne({ _id: materialId }, { $inc: { commentCount: 1 } }, { timestamps: false }),
      parent
        ? Comment.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } }, { timestamps: false })
        : null,
    ]);

    const dto = toCommentDto(created.toObject(), new Set());
    return NextResponse.json(
      { comment: { ...dto, ...(parent ? {} : { replies: [] }) } },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/comments");
  }
}
