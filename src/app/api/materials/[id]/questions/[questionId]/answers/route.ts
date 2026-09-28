// GET  /api/materials/[id]/questions/[questionId]/answers - public
//   Accepted answer first, then most upvoted, then oldest. Signed-in
//   requests also get upvotedByMe.
// POST /api/materials/[id]/questions/[questionId]/answers - sign-in required
//   Body: { answerText, workings?, explanation?, selectedOption? }
//   (selectedOption required for objective questions). One answer per user
//   per question (409 on a second).
//
// The question's answerCount is taken before the answer is written: question
// edit and delete require answerCount 0 in the same write, so an answer can
// never end up under a deleted or reworded question.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { getCurrentSessionUser, requireAuth } from "@/lib/auth/session";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey } from "@/lib/adminApi";
import { redis } from "@/lib/redis";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import { getTypedAnswerModel, type ITypedAnswer } from "@/lib/models/typedAnswerModel";
import { getUserModel } from "@/lib/models/userModel";
import { answerUpvotesKey, loadActiveMaterial, parseAnswerBody, toAnswerDto } from "@/lib/layer2";

type Context = { params: Promise<{ id: string; questionId: string }> };

async function loadQuestion(context: Context) {
  const { id, questionId } = await context.params;
  if (!isValidObjectId(questionId)) return null;
  const material = await loadActiveMaterial(id);
  if (!material) return null;
  const Question = await getTypedQuestionModel();
  return Question.findOne({ _id: questionId, materialId: material._id }).lean<ITypedQuestion>();
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `answers:${getClientIp(request)}`);
    const question = await loadQuestion(context);
    if (!question) return fail(404, "Question not found.");

    const Answer = await getTypedAnswerModel();
    const answers = await Answer.find({ questionId: question._id })
      .sort({ isAccepted: -1, upvoteCount: -1, createdAt: 1, _id: 1 })
      .lean<ITypedAnswer[]>();

    const User = await getUserModel();
    const accepters = await User.find({ _id: { $in: answers.map((a) => a.acceptedBy).filter((v): v is Types.ObjectId => !!v) } })
      .select("upid role")
      .lean();
    const accepterById = new Map(accepters.map((u) => [String(u._id), { upid: u.upid, role: u.role }]));

    let upvoted: Set<string> | undefined;
    const viewer = await getCurrentSessionUser(request);
    if (viewer && answers.length) {
      try {
        const ids = answers.map((a) => String(a._id));
        const flags = await redis.smismember(answerUpvotesKey(viewer.userId), ids);
        upvoted = new Set(ids.filter((_, i) => flags[i] === 1));
      } catch (error) {
        console.error("answers: upvote lookup failed:", error);
      }
    }

    return NextResponse.json(
      {
        answers: answers.map((a) =>
          toAnswerDto(a, { upvoted, acceptedBy: a.acceptedBy ? accepterById.get(String(a.acceptedBy)) : undefined }),
        ),
        acceptedAnswerId: question.acceptedAnswerId ? String(question.acceptedAnswerId) : null,
        total: answers.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/questions/[questionId]/answers");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "comment", `answer:${session.userId}`);
    const question = await loadQuestion(context);
    if (!question) return fail(404, "Question not found.");

    const parsed = parseAnswerBody(await readJson(request), question);
    if (!parsed.ok) return fail(400, parsed.message);

    const Answer = await getTypedAnswerModel();
    const userId = new Types.ObjectId(session.userId);
    if (await Answer.exists({ questionId: question._id, submittedBy: userId })) {
      return fail(409, "You've already answered this question.");
    }

    // Reserve the count first (see the note at the top)
    const Question = await getTypedQuestionModel();
    const reserved = await Question.updateOne(
      { _id: question._id },
      { $inc: { answerCount: 1 } },
      { timestamps: false },
    );
    if (reserved.matchedCount === 0) return fail(404, "Question not found.");

    try {
      const created = await Answer.create({
        ...parsed.value,
        questionId: question._id,
        materialId: question.materialId,
        submittedBy: userId,
        submittedByUpid: session.upid,
      });
      return NextResponse.json({ answer: toAnswerDto(created.toObject(), { upvoted: new Set() }) }, { status: 201 });
    } catch (error) {
      await Question.updateOne({ _id: question._id }, { $inc: { answerCount: -1 } }, { timestamps: false });
      if (isDuplicateKey(error)) return fail(409, "You've already answered this question.");
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/questions/[questionId]/answers");
  }
}
