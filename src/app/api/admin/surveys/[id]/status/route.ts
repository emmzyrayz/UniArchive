// POST /api/admin/surveys/[id]/status  { status: "open" | "closed" }
// Opens a complete survey (it then takes answers within its optional
// window) or closes it. A closed survey can be reopened.
// Permission: "survey.manage".
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { cleanSurveyInput, toSurveyDto } from "@/lib/survey/surveys";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "survey.manage");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const input = await readJson<{ status: unknown }>(request);
    const next = input?.status;
    if (next !== "open" && next !== "closed") return fail(400, 'status must be "open" or "closed".');

    const Survey = await getSurveyModel();
    const current = await Survey.findById(id).lean<ISurvey>();
    if (!current) return fail(404, "Survey not found.");
    if (next === "open") {
      const { problems } = cleanSurveyInput({}, current);
      if (problems.length) return fail(400, `Finish the survey first: ${problems.join(" ")}`);
    }
    const now = new Date();
    const updated = await Survey.findByIdAndUpdate(
      current._id,
      { $set: { status: next, ...(next === "open" ? { openedAt: current.openedAt ?? now } : { closedAt: now }) } },
      { returnDocument: "after" },
    ).lean<ISurvey>();
    return NextResponse.json({ survey: toSurveyDto(updated!) });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/surveys/[id]/status");
  }
}
