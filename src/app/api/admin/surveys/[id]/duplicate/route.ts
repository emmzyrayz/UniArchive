// POST /api/admin/surveys/[id]/duplicate
// A new draft with the same questions and settings (e.g. to change
// questions that already have answers, or rerun a survey next semester).
// Permission: "survey.manage".
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { SURVEY_LIMITS, cleanSurveyInput, toSurveyDto, uniqueSlug } from "@/lib/survey/surveys";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `surveys:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const Survey = await getSurveyModel();
    const source = await Survey.findById(id).lean<ISurvey>();
    if (!source) return fail(404, "Survey not found.");

    const clean = cleanSurveyInput({ title: `Copy of ${source.title}`.slice(0, SURVEY_LIMITS.title), slug: "" }, { ...source, responseCount: 0 });
    const slug = await uniqueSlug(clean.slug, async (s) => !!(await Survey.exists({ slug: s })));
    const me = { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName };
    const created = await Survey.create({
      slug,
      title: clean.title,
      intro: clean.intro,
      thankYouMessage: clean.thankYouMessage,
      respondentFields: clean.respondentFields,
      questions: clean.questions,
      createdBy: me,
      updatedBy: me,
    });
    return NextResponse.json({ survey: toSurveyDto(created.toObject()) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/surveys/[id]/duplicate");
  }
}
