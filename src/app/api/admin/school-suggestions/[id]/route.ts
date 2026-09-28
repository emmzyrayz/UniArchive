// PATCH /api/admin/school-suggestions/[id]
// Decide a school suggestion. Permission: "manage_institution".
//
// { action: "approve", universityName?, universityAbbr?, universityState?,
//   universityOwnership?, facultyName?, departmentName?,
//   existingUniversityId?, existingFacultyId? }
//   Creates what the suggestion's scope says is missing (overriding the
//   suggested names if given; existing* links instead of creating) and
//   completes every waiting user's profile. See src/lib/suggestionReview.ts.
// { action: "mark_duplicate", existingUniversityId, existingFacultyId? }
//   Links to an existing university; creates nothing.
// { action: "reject", reviewNote }
//   The note is kept on the suggestion; users can suggest again.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, optionalString } from "@/lib/adminApi";
import {
  ReviewError,
  approveSuggestion,
  loadDecidable,
  markDuplicate,
  rejectSuggestion,
  type ApproveOverrides,
} from "@/lib/suggestionReview";

type Context = { params: Promise<{ id: string }> };

/** Optional override strings; null for a malformed one. */
function overrides(body: Record<string, unknown>): ApproveOverrides | null {
  const out: ApproveOverrides = {};
  const fields: [keyof ApproveOverrides, number][] = [
    ["universityName", 200],
    ["universityAbbr", 30],
    ["universityState", 50],
    ["universityOwnership", 10],
    ["facultyName", 200],
    ["departmentName", 200],
    ["existingUniversityId", 24],
    ["existingFacultyId", 24],
  ];
  for (const [key, max] of fields) {
    const value = optionalString(body[key], max);
    if (value === null) return null;
    if (value) (out as Record<string, string>)[key] = value;
  }
  return out;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    await enforceRateLimit(request, "admin", `admin-suggestions:${session.userId}`);
    const { id } = await context.params;

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");
    const reviewer = { userId: session.userId, upid: session.upid };

    try {
      const suggestion = await loadDecidable(id);

      switch (body.action) {
        case "approve": {
          const o = overrides(body);
          if (!o) return fail(400, "One of the fields is too long or not text.");
          const summary = await approveSuggestion(suggestion, o, reviewer);
          console.info(`admin: @${session.upid} approved school suggestion ${id}`, summary);
          return NextResponse.json({ success: true, ...summary });
        }
        case "mark_duplicate": {
          const universityId = optionalString(body.existingUniversityId, 24);
          if (!universityId) return fail(400, "Choose the existing university.");
          const facultyId = optionalString(body.existingFacultyId, 24) || undefined;
          const summary = await markDuplicate(suggestion, universityId, facultyId, reviewer);
          console.info(`admin: @${session.upid} marked school suggestion ${id} as duplicate`, summary);
          return NextResponse.json({ success: true, ...summary });
        }
        case "reject": {
          const note = optionalString(body.reviewNote, 1000);
          if (!note) return fail(400, "A reason (up to 1000 characters) is required.");
          const summary = await rejectSuggestion(suggestion, note, reviewer);
          console.info(`admin: @${session.upid} rejected school suggestion ${id}`);
          return NextResponse.json({ success: true, ...summary });
        }
        default:
          return fail(400, 'action must be "approve", "mark_duplicate" or "reject".');
      }
    } catch (error) {
      if (error instanceof ReviewError) return fail(error.status, error.message);
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/school-suggestions/[id]");
  }
}
