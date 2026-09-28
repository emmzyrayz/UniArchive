// PATCH  /api/materials/[id]/questions/[questionId] - edit a question
//   The person who typed it, or auditor+. Only while nobody has answered it
//   (answers were written against the original wording): the update's own
//   filter requires answerCount 0, so an answer landing meanwhile wins.
//   Body: same as POST.
// DELETE /api/materials/[id]/questions/[questionId]
//   The person who typed it, or com_admin+. Only with no answers (409
//   otherwise), for the same reason.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey } from "@/lib/adminApi";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import {
  atLeast,
  canAcceptAnswers,
  parseQuestionBody,
  refreshTypedContentFlag,
  toQuestionDto,
} from "@/lib/layer2";

type Context = { params: Promise<{ id: string; questionId: string }> };

async function loadQuestion(context: Context) {
  const { id, questionId } = await context.params;
  if (!isValidObjectId(id) || !isValidObjectId(questionId)) return null;
  const Question = await getTypedQuestionModel();
  return Question.findOne({ _id: questionId, materialId: id }).lean<ITypedQuestion>();
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `questions-write:${session.userId}`);
    const question = await loadQuestion(context);
    if (!question) return fail(404, "Question not found.");
    const isAuthor = String(question.submittedBy) === session.userId;
    if (!isAuthor && !atLeast(session.role, "auditor")) return fail(403, "You can only edit questions you typed.");
    if (question.answerCount > 0) return fail(409, "This question already has answers, so it can't be edited.");

    const parsed = parseQuestionBody(await readJson(request), canAcceptAnswers(session.role));
    if (!parsed.ok) return fail(400, parsed.message);

    const Question = await getTypedQuestionModel();
    const unset: Record<string, ""> = {};
    if (!parsed.value.questionPart) unset.questionPart = "";
    if (parsed.value.marks === undefined) unset.marks = "";
    if (!parsed.value.options) unset.options = "";
    let updated: ITypedQuestion | null;
    try {
      updated = await Question.findOneAndUpdate(
        { _id: question._id, answerCount: 0 },
        { $set: parsed.value, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { returnDocument: "after", runValidators: true },
      ).lean<ITypedQuestion>();
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "Another question already uses that number and part.");
      throw error;
    }
    if (!updated) return fail(409, "Someone answered this question meanwhile, so it can't be edited.");
    return NextResponse.json({ question: toQuestionDto(updated, { answeredByMe: false }) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/materials/[id]/questions/[questionId]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `questions-write:${session.userId}`);
    const question = await loadQuestion(context);
    if (!question) return fail(404, "Question not found.");
    const isAuthor = String(question.submittedBy) === session.userId;
    if (!isAuthor && !atLeast(session.role, "com_admin")) return fail(403, "You can only delete questions you typed.");

    const Question = await getTypedQuestionModel();
    const deleted = await Question.findOneAndDelete({ _id: question._id, answerCount: 0 }).lean();
    if (!deleted) return fail(409, "Cannot delete a question with existing answers.");
    await refreshTypedContentFlag(question.materialId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/materials/[id]/questions/[questionId]");
  }
}
