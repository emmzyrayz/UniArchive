// /api/admin/surveys. Permission: "survey.manage" (com_admin, dev).
// GET   ?status=draft|open|closed|all (default all), page, limit
// POST  { title?, ...builder fields } -> a new draft (201)
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey, type SurveyStatus } from "@/lib/models/surveyModel";
import { cleanSurveyInput, toSurveyDto, uniqueSlug, type AdminSurveyDto } from "@/lib/survey/surveys";

const STATUSES: (SurveyStatus | "all")[] = ["all", "draft", "open", "closed"];

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "survey.manage");
    const params = request.nextUrl.searchParams;
    const status = (params.get("status") ?? "all") as SurveyStatus | "all";
    if (!STATUSES.includes(status)) return fail(400, 'status must be "draft", "open", "closed" or "all".');
    const { page, limit, skip } = pagination(params);
    const filter = status === "all" ? {} : { status };
    const Survey = await getSurveyModel();
    const [docs, total] = await Promise.all([
      Survey.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean<ISurvey[]>(),
      Survey.countDocuments(filter),
    ]);
    const body: { surveys: AdminSurveyDto[]; total: number; page: number; totalPages: number } = {
      surveys: docs.map(toSurveyDto),
      total,
      page,
      totalPages: totalPages(total, limit),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/surveys");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "admin", `surveys:${session.userId}`);
    const input = (await readJson<Record<string, unknown>>(request)) ?? {};
    const clean = cleanSurveyInput({ title: "Untitled survey", ...input });
    const Survey = await getSurveyModel();
    const slug = await uniqueSlug(clean.slug, async (s) => !!(await Survey.exists({ slug: s })));
    const me = { userId: new Types.ObjectId(session.userId), upid: session.upid, name: session.fullName };
    const created = await Survey.create({
      slug,
      title: clean.title,
      intro: clean.intro,
      thankYouMessage: clean.thankYouMessage,
      respondentFields: clean.respondentFields,
      questions: clean.questions,
      ...(clean.opensAt && { opensAt: clean.opensAt }),
      ...(clean.closesAt && { closesAt: clean.closesAt }),
      createdBy: me,
      updatedBy: me,
    });
    return NextResponse.json({ survey: toSurveyDto(created.toObject()) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/surveys");
  }
}
