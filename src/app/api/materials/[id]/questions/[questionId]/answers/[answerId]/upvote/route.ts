// POST /api/materials/[id]/questions/[questionId]/answers/[answerId]/upvote
// Toggle your upvote on an answer; not your own. Same design as comment
// upvotes: a Redis set of answer ids per user, where SADD / SREM report
// atomically whether anything changed, so the count can't be bumped twice.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { redis } from "@/lib/redis";
import { getTypedAnswerModel, type ITypedAnswer } from "@/lib/models/typedAnswerModel";
import { answerUpvotesKey } from "@/lib/layer2";

type Context = { params: Promise<{ id: string; questionId: string; answerId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `answer-upvote:${session.userId}`);
    const { id, questionId, answerId } = await context.params;
    if (![id, questionId, answerId].every((v) => isValidObjectId(v))) return fail(404, "Answer not found.");

    const Answer = await getTypedAnswerModel();
    const answer = await Answer.findOne({ _id: answerId, questionId, materialId: id })
      .select("submittedBy")
      .lean<Pick<ITypedAnswer, "_id" | "submittedBy">>();
    if (!answer) return fail(404, "Answer not found.");
    if (String(answer.submittedBy) === session.userId) return fail(403, "You can't upvote your own answer.");

    const key = answerUpvotesKey(session.userId);
    let upvoted: boolean;
    if ((await redis.sadd(key, answerId)) === 1) {
      upvoted = true;
      await Answer.updateOne({ _id: answer._id }, { $inc: { upvoteCount: 1 } }, { timestamps: false });
    } else {
      upvoted = false;
      if ((await redis.srem(key, answerId)) === 1) {
        await Answer.updateOne(
          { _id: answer._id, upvoteCount: { $gt: 0 } },
          { $inc: { upvoteCount: -1 } },
          { timestamps: false },
        );
      }
    }
    const fresh = await Answer.findById(answer._id).select("upvoteCount").lean<Pick<ITypedAnswer, "upvoteCount">>();
    return NextResponse.json({ action: upvoted ? "added" : "removed", upvoted, upvoteCount: fresh?.upvoteCount ?? 0 });
  } catch (error) {
    return handleRouteError(error, "POST .../answers/[answerId]/upvote");
  }
}
