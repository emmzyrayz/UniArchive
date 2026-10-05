// GET /api/admin/surveys/[id]/results
//   ?school=<universityId|unlisted>&faculty=&department=&level=&role=
//   &account=signed_in|anonymous&from=YYYY-MM-DD&to=YYYY-MM-DD&q=
// Per-question summaries of the matching responses, the values each filter
// can take, and responses per day. Permission: "survey.manage".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { parseFilters, surveyResults } from "@/lib/survey/analysis";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `survey-results:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const survey = await (await getSurveyModel()).findById(id).lean<ISurvey>();
    if (!survey) return fail(404, "Survey not found.");
    const results = await surveyResults(survey, parseFilters(request.nextUrl.searchParams));
    return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/surveys/[id]/results");
  }
}
