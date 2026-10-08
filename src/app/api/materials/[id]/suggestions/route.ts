// /api/materials/[id]/suggestions: "Help identify this PDF".
// GET   { mine, prefill, count } for anyone (mine/prefill need a sign-in to
//       be personal); staff ("admin.view_submissions" or "material.ingest")
//       also get `groups`: pending suggestions grouped by agreement.
// POST  the details you believe this unverified PDF has (same fields as a
//       submission); one per person, sending again updates yours while it's
//       pending. Signed in; `materialSuggest` limiter.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { getCurrentSessionUser, requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { PUBLIC_MATERIALS, getMaterialModel, type IMaterial } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel, type IMaterialSuggestion } from "@/lib/models/materialSuggestionModel";
import { parseSuggestion, suggestionFingerprint, suggestionGroups, toSuggestionFieldsDto } from "@/lib/materialSuggestions";
import type { SubmissionBody } from "@/lib/submissions";
import type { MaterialSuggestionsResponse } from "@/types/unilibrary";
import { scoutStreak } from "@/lib/scouts/streaks";
import { awardBadgesAfter } from "@/lib/badges";

type Context = { params: Promise<{ id: string }> };

const DETAIL_FIELDS =
  "title description category subcategory tags universityId universityName universityAbbr facultyId facultyName " +
  "departmentId departmentName courseCode courseName level semester academicYear status";

async function loadMaterial(id: string) {
  if (!isValidObjectId(id)) return null;
  const Material = await getMaterialModel();
  return Material.findOne({ _id: id, ...PUBLIC_MATERIALS }).select(DETAIL_FIELDS).lean<IMaterial>();
}

function mineDto(s: IMaterialSuggestion | null): MaterialSuggestionsResponse["mine"] {
  return s ? { ...toSuggestionFieldsDto(s.fields), status: s.status, updatedAt: new Date(s.updatedAt).toISOString() } : null;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public");
    const material = await loadMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");
    const session = await getCurrentSessionUser(request);
    const Suggestion = await getMaterialSuggestionModel();
    const [mine, count] = await Promise.all([
      session
        ? Suggestion.findOne({ materialId: material._id, userId: new Types.ObjectId(session.userId) }).lean<IMaterialSuggestion>()
        : Promise.resolve(null),
      Suggestion.countDocuments({ materialId: material._id, status: "pending" }),
    ]);
    const staff = !!session && (can(session.role, "admin.view_submissions") || can(session.role, "material.ingest"));
    const body: MaterialSuggestionsResponse = {
      mine: mineDto(mine),
      prefill: mine ? toSuggestionFieldsDto(mine.fields) : toSuggestionFieldsDto(material),
      count,
      ...(staff ? { groups: await suggestionGroups(material._id) } : {}),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/suggestions");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "materialSuggest", `material-suggest:${session.userId}`);
    const material = await loadMaterial((await context.params).id);
    if (!material) return fail(404, "Material not found.");
    if (material.status !== "unverified") return fail(409, "This material has already been checked by our team.");

    const fields = await parseSuggestion(await readJson<SubmissionBody>(request));
    const Suggestion = await getMaterialSuggestionModel();
    const owner = { materialId: material._id, userId: new Types.ObjectId(session.userId) };
    const existing = await Suggestion.findOne(owner).select("status").lean();
    if (existing && existing.status !== "pending") return fail(409, "Your suggestion for this PDF has already been reviewed.");
    // Archive Scouts: a new suggestion counts toward the streak and keeps the multiplier it was sent with
    const multiplier = existing ? undefined : (await scoutStreak(session.userId)).multiplier;
    const saved = await Suggestion.findOneAndUpdate(
      { ...owner, status: "pending" },
      {
        $set: { fields, fingerprint: suggestionFingerprint(fields), userUpid: session.upid },
        ...(multiplier ? { $setOnInsert: { multiplier } } : {}),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean<IMaterialSuggestion>();
    if (!existing) awardBadgesAfter(session.userId, "scout_streak");
    return NextResponse.json({ mine: mineDto(saved), created: !existing }, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/suggestions");
  }
}
