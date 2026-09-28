// PATCH /api/materials/[id]/questions/[questionId]/answers/[answerId]/accept
// Mark an answer as the accepted one. Permission: "submission.verify_tier2"
// (lecturer, ed_admin, com_admin, webmaster, dev); never your own answer.
// One accepted answer per question: accepting another replaces it.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import { getTypedAnswerModel, type ITypedAnswer } from "@/lib/models/typedAnswerModel";
import { canAcceptAnswers, toAnswerDto, toQuestionDto } from "@/lib/layer2";

type Context = { params: Promise<{ id: string; questionId: string; answerId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    if (!canAcceptAnswers(session.role)) return fail(403, "Only lecturers and admins can accept answers.");
    await enforceRateLimit(request, "admin", `accept-answer:${session.userId}`);
    const { id, questionId, answerId } = await context.params;
    if (![id, questionId, answerId].every((v) => isValidObjectId(v))) return fail(404, "Answer not found.");

    const Answer = await getTypedAnswerModel();
    const answer = await Answer.findOne({ _id: answerId, questionId, materialId: id }).lean<ITypedAnswer>();
    if (!answer) return fail(404, "Answer not found.");
    if (String(answer.submittedBy) === session.userId) return fail(403, "You can't accept your own answer.");

    const now = new Date();
    // Un-accept the previous one, accept this one, then point the question at it
    await Answer.updateMany(
      { questionId: answer.questionId, isAccepted: true, _id: { $ne: answer._id } },
      { $set: { isAccepted: false }, $unset: { acceptedBy: "", acceptedAt: "" } },
    );
    const accepted = await Answer.findByIdAndUpdate(
      answer._id,
      { $set: { isAccepted: true, acceptedBy: session.userId, acceptedAt: now } },
      { returnDocument: "after" },
    ).lean<ITypedAnswer>();
    const Question = await getTypedQuestionModel();
    const question = await Question.findByIdAndUpdate(
      answer.questionId,
      { $set: { acceptedAnswerId: answer._id } },
      { returnDocument: "after" },
    ).lean<ITypedQuestion>();
    if (!accepted || !question) return fail(404, "Answer not found.");

    console.info(`layer2: @${session.upid} accepted answer ${answerId} on question ${questionId}`);
    const acceptedBy = { upid: session.upid, role: session.role };
    const answerDto = toAnswerDto(accepted, { acceptedBy });
    return NextResponse.json({
      answer: answerDto,
      question: toQuestionDto(question, { acceptedAnswer: answerDto, answeredByMe: null }),
    });
  } catch (error) {
    return handleRouteError(error, "PATCH .../answers/[answerId]/accept");
  }
}
