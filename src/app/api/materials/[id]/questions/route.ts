// GET  /api/materials/[id]/questions - public
//   Every typed question on a past question material, in paper order
//   (number, then part), each with its accepted answer inline. Signed-in
//   requests also get answeredByMe per question.
// POST /api/materials/[id]/questions - sign-in required
//   Type out one question. Past question materials only (category EXAMS).
//   Body: { questionNumber, questionPart?, questionText, questionType,
//   marks?, options? } (options: 2-6, objective only; isCorrect is only
//   kept from lecturer+). The same number + part twice is a 409.
//   Optional Idempotency-Key header (the conversion workspace sends
//   "<draft>:<item>"): a retry with the same key returns the question it
//   already created (200, replayed: true) instead of a duplicate or a 409.
import { NextResponse, type NextRequest } from "next/server";
import { invalidateConversionStats } from "@/lib/conversionStats";
import { Types } from "mongoose";
import { getCurrentSessionUser, requireAuth } from "@/lib/auth/session";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey } from "@/lib/adminApi";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import { getTypedAnswerModel, type ITypedAnswer } from "@/lib/models/typedAnswerModel";
import { getUserModel } from "@/lib/models/userModel";
import { QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { IDEMPOTENCY_HEADER, isIdempotencyKey } from "@/lib/conversions";
import {
  canAcceptAnswers,
  loadActiveMaterial,
  parseQuestionBody,
  questionWordCount,
  refreshTypedContentFlag,
  toAnswerDto,
  toQuestionDto,
} from "@/lib/layer2";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `questions:${getClientIp(request)}`);
    const material = await loadActiveMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");

    const Question = await getTypedQuestionModel();
    const questions = await Question.find({ materialId: material._id })
      .sort({ questionNumber: 1, questionPart: 1, _id: 1 })
      .lean<ITypedQuestion[]>();

    const Answer = await getTypedAnswerModel();
    const acceptedIds = questions.map((q) => q.acceptedAnswerId).filter((id): id is Types.ObjectId => !!id);
    const viewer = await getCurrentSessionUser(request);
    const [accepted, mine] = await Promise.all([
      acceptedIds.length ? Answer.find({ _id: { $in: acceptedIds } }).lean<ITypedAnswer[]>() : [],
      viewer && questions.length
        ? Answer.find({ materialId: material._id, submittedBy: new Types.ObjectId(viewer.userId) })
            .select("questionId")
            .lean<Pick<ITypedAnswer, "questionId">[]>()
        : [],
    ]);

    // Who accepted each accepted answer, for "Accepted by @upid (Lecturer)"
    const User = await getUserModel();
    const accepters = await User.find({ _id: { $in: accepted.map((a) => a.acceptedBy).filter((v): v is Types.ObjectId => !!v) } })
      .select("upid role")
      .lean();
    const accepterById = new Map(accepters.map((u) => [String(u._id), { upid: u.upid, role: u.role }]));
    const acceptedById = new Map(
      accepted.map((a) => [String(a._id), toAnswerDto(a, { acceptedBy: accepterById.get(String(a.acceptedBy)) })]),
    );
    const answered = new Set(mine.map((a) => String(a.questionId)));

    return NextResponse.json(
      {
        questions: questions.map((q) =>
          toQuestionDto(q, {
            acceptedAnswer: q.acceptedAnswerId ? acceptedById.get(String(q.acceptedAnswerId)) : undefined,
            answeredByMe: viewer ? answered.has(String(q._id)) : null,
          }),
        ),
        total: questions.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/questions");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `questions-write:${session.userId}`);
    const material = await loadActiveMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");
    if (!QUESTION_CATEGORIES.includes(material.category)) {
      return fail(400, "Typed questions can only be added to past question materials.");
    }

    const parsed = parseQuestionBody(await readJson(request), canAcceptAnswers(session.role));
    if (!parsed.ok) return fail(400, parsed.message);

    const Question = await getTypedQuestionModel();
    const rawKey = request.headers.get(IDEMPOTENCY_HEADER);
    if (rawKey !== null && !isIdempotencyKey(rawKey)) return fail(400, "Invalid Idempotency-Key.");
    // Scoped to the user, so one person's key can't reveal another's question
    const submissionKey = rawKey ? `${session.userId}:${rawKey}` : undefined;
    const replay = async () => {
      const existing = submissionKey ? await Question.findOne({ submissionKey }).lean<ITypedQuestion>() : null;
      return existing
        ? NextResponse.json({ question: toQuestionDto(existing, { answeredByMe: false }), replayed: true })
        : null;
    };
    const earlier = await replay();
    if (earlier) return earlier;

    try {
      const created = await Question.create({
        ...parsed.value,
        materialId: material._id,
        submittedBy: session.userId,
        submittedByUpid: session.upid,
        wordCount: questionWordCount(parsed.value),
        ...(submissionKey ? { submissionKey } : {}),
      });
      await refreshTypedContentFlag(material._id);
      await invalidateConversionStats(session.userId);
      return NextResponse.json(
        { question: toQuestionDto(created.toObject(), { answeredByMe: false }) },
        { status: 201 },
      );
    } catch (error) {
      if (isDuplicateKey(error)) {
        // A concurrent retry with the same key won the race
        const raced = await replay();
        if (raced) return raced;
        const label = `${parsed.value.questionNumber}${parsed.value.questionPart ?? ""}`;
        return fail(409, `Question ${label} has already been typed for this material.`);
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/questions");
  }
}
