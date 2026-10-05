// POST /api/surveys/[slug]/responses
// Anyone can answer an open survey, signed in or not. Body:
//   { respondent: {...}, answers: { [questionId]: value }, startedAt, website }
// One response per person: signed-in people by account, others by a random
// key in an httpOnly cookie (set here on the first answer). Sending again
// changes the earlier answers until the survey closes.
// Spam: `website` is a hidden field people leave empty, `startedAt` (when
// the form was shown) must be a few seconds back, and each IP gets 20
// submissions an hour.
// 201 { ok, created: true } | 200 { ok, created: false }
// 400 { message, errors: { "about.<field>" | <questionId>: message } }
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { loadPublicSurvey } from "@/lib/survey/public";
import {
  MIN_FILL_MS,
  SURVEY_KEY_COOKIE,
  SURVEY_KEY_MAX_AGE,
  SurveyError,
  hashSurveyKey,
  newSurveyKey,
  submitSurveyResponse,
} from "@/lib/survey/respond";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const survey = await loadPublicSurvey(slug);
    if (!survey) return NextResponse.json({ message: "Survey not found." }, { status: 404 });

    const body = await readJson<{ respondent: unknown; answers: unknown; startedAt: unknown; website: unknown }>(request);
    if (!body) return NextResponse.json({ message: "Invalid request body." }, { status: 400 });

    const ip = getClientIp(request);
    await enforceRateLimit(request, "surveyResponse", `survey:${ip}`);
    // Filled-in honeypot: look successful, keep nothing
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true, created: true }, { status: 201 });
    }
    const startedAt = typeof body.startedAt === "number" ? body.startedAt : 0;
    if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      return NextResponse.json({ message: "That was quick! Take a moment to read the questions, then send again." }, { status: 400 });
    }

    const session = await getCurrentSessionUser(request);
    const existingKey = request.cookies.get(SURVEY_KEY_COOKIE)?.value;
    let keyHash = session ? undefined : hashSurveyKey(existingKey);
    const newKey = !session && !keyHash ? newSurveyKey() : undefined;
    if (newKey) keyHash = hashSurveyKey(newKey);

    const { created } = await submitSurveyResponse({
      survey,
      session,
      keyHash,
      ip,
      respondent: body.respondent,
      answers: body.answers,
    });
    const response = NextResponse.json({ ok: true, created }, { status: created ? 201 : 200 });
    if (newKey) {
      response.cookies.set(SURVEY_KEY_COOKIE, newKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SURVEY_KEY_MAX_AGE,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof SurveyError) {
      return NextResponse.json({ message: error.message, ...(error.errors && { errors: error.errors }) }, { status: error.status });
    }
    return handleRouteError(error, "POST /api/surveys/[slug]/responses");
  }
}
