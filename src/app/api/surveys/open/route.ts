// GET /api/surveys/open
// Surveys taking answers now, for the ribbon and the dashboard banner:
// { surveys: [{ slug, title, closesAt?, answered }] }. `answered` is for
// the visitor (their account, or the anonymous key cookie). Public.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyResponseModel } from "@/lib/models/surveyResponseModel";
import { listOpenSurveys } from "@/lib/survey/public";
import { SURVEY_KEY_COOKIE, hashSurveyKey } from "@/lib/survey/respond";
import type { OpenSurveysResponse } from "@/types/survey";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "public");
    const surveys = await listOpenSurveys();
    let answered = new Set<string>();
    if (surveys.length) {
      const session = await getCurrentSessionUser(request);
      const keyHash = session ? undefined : hashSurveyKey(request.cookies.get(SURVEY_KEY_COOKIE)?.value);
      if (session || keyHash) {
        const Response = await getSurveyResponseModel();
        const mine = await Response.find({
          surveyId: { $in: surveys.map((s) => s._id) },
          ...(session ? { userId: new Types.ObjectId(session.userId) } : { respondentKeyHash: keyHash }),
        })
          .select("surveyId")
          .lean();
        answered = new Set(mine.map((r) => String(r.surveyId)));
      }
    }
    const body: OpenSurveysResponse = {
      surveys: surveys.map((s) => ({
        slug: s.slug,
        title: s.title,
        ...(s.closesAt && { closesAt: new Date(s.closesAt).toISOString() }),
        answered: answered.has(String(s._id)),
      })),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/surveys/open");
  }
}
