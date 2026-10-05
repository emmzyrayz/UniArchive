// DELETE /api/admin/surveys/[id]/responses/[responseId]
// Removes one response (spam, a test, or at the person's request) and
// keeps the survey's responseCount in step. Permission: "survey.manage".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel } from "@/lib/models/surveyModel";
import { getSurveyResponseModel } from "@/lib/models/surveyResponseModel";

type Context = { params: Promise<{ id: string; responseId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `surveys:${session.userId}`);
    const { id, responseId } = await context.params;
    if (!isValidObjectId(id) || !isValidObjectId(responseId)) return fail(404, "Response not found.");
    const Response = await getSurveyResponseModel();
    const deleted = await Response.findOneAndDelete({ _id: responseId, surveyId: id }).select("_id").lean();
    if (!deleted) return fail(404, "Response not found.");
    const Survey = await getSurveyModel();
    await Survey.updateOne({ _id: id, responseCount: { $gt: 0 } }, { $inc: { responseCount: -1 } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/surveys/[id]/responses/[responseId]");
  }
}
