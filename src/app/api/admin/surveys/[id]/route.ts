// /api/admin/surveys/[id]. Permission: "survey.manage".
// GET     the survey
// PATCH   builder fields (title, slug, intro, thankYouMessage,
//         respondentFields, questions, opensAt, closesAt). Once it has
//         responses, question changes that would alter existing answers
//         are refused (409, see lockedChanges); an open survey must stay
//         complete (400 with the problems).
// DELETE  only a survey with no responses
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { cleanSurveyInput, toSurveyDto, uniqueSlug } from "@/lib/survey/surveys";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "survey.manage");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const doc = await (await getSurveyModel()).findById(id).lean<ISurvey>();
    if (!doc) return fail(404, "Survey not found.");
    return NextResponse.json({ survey: toSurveyDto(doc) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/surveys/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `surveys:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const input = await readJson<Record<string, unknown>>(request);
    if (!input) return fail(400, "Invalid request body.");

    const Survey = await getSurveyModel();
    const current = await Survey.findById(id).lean<ISurvey>();
    if (!current) return fail(404, "Survey not found.");
    const clean = cleanSurveyInput(input, current);
    if (clean.locked.length) return fail(409, clean.locked.join(" "));
    if (current.status === "open" && clean.problems.length) {
      return fail(400, `An open survey must stay complete: ${clean.problems.join(" ")}`);
    }
    const slug =
      clean.slug === current.slug
        ? current.slug
        : await uniqueSlug(clean.slug, async (s) => !!(await Survey.exists({ slug: s, _id: { $ne: current._id } })));

    const updated = await Survey.findByIdAndUpdate(
      current._id,
      {
        $set: {
          slug,
          title: clean.title,
          intro: clean.intro,
          thankYouMessage: clean.thankYouMessage,
          respondentFields: clean.respondentFields,
          questions: clean.questions,
          updatedBy: { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName },
          ...(clean.opensAt && { opensAt: clean.opensAt }),
          ...(clean.closesAt && { closesAt: clean.closesAt }),
        },
        $unset: { ...(!clean.opensAt && { opensAt: 1 }), ...(!clean.closesAt && { closesAt: 1 }) },
      },
      { returnDocument: "after" },
    ).lean<ISurvey>();
    return NextResponse.json({ survey: toSurveyDto(updated!) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/surveys/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "survey.manage");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const Survey = await getSurveyModel();
    const result = await Survey.deleteOne({ _id: id, responseCount: 0 });
    if (result.deletedCount === 0) {
      return (await Survey.exists({ _id: id }))
        ? fail(409, "This survey has responses; close it instead.")
        : fail(404, "Survey not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/surveys/[id]");
  }
}
