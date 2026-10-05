// GET /api/admin/surveys/[id]/responses?<results filters>&page=&limit=
// Individual responses, newest first, with who answered (email decrypted:
// respondents gave it for follow-up). Permission: "survey.manage".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail, pagination } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { listResponses, parseFilters } from "@/lib/survey/analysis";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `survey-results:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const survey = await (await getSurveyModel()).findById(id).lean<ISurvey>();
    if (!survey) return fail(404, "Survey not found.");
    const params = request.nextUrl.searchParams;
    const { page, limit } = pagination(params, 20);
    const body = await listResponses(survey, parseFilters(params), page, limit);
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/surveys/[id]/responses");
  }
}
