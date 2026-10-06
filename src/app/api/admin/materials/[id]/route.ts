// GET /api/admin/materials/[id]
// What the outline editor needs: title, type, page count, book and the
// current outline (also for deactivated materials).
//
// PATCH /api/admin/materials/[id]
// Deactivate / reactivate a material, or correct its metadata.
// Permission: "admin.view_submissions" for both.
//
// Body (all optional): isActive, clearReports (true: puts a PDF hidden by
// reports back in the listing and resets its report count), title, courseCode, level, semester,
// academicYear, tags, outline ({ entries: [...] }, or null / no entries to
// remove it; see lib/outline.ts). An empty string clears courseCode / level /
// semester / academicYear. Everything else (submitter, book, storage, verification
// tiers and their reviewers) is an audit field and can't be changed here.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, optionalString } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { parseOutline } from "@/lib/outline";
import {
  SUBMISSION_LEVELS,
  SUBMISSION_SEMESTERS,
} from "@/lib/models/materialSubmissionModel";
import {
  ADMIN_MATERIAL_FIELDS,
  toAdminMaterialDto,
  type AdminMaterialDoc,
} from "@/lib/adminMaterials";

type Context = { params: Promise<{ id: string }> };

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

function isAcademicYear(value: string): boolean {
  const m = /^(\d{4})\/(\d{4})$/.exec(value);
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

/** Fields that can be corrected or cleared with "". */
const CLEARABLE: {
  key: "courseCode" | "level" | "semester" | "academicYear";
  max: number;
  normalise?: (v: string) => string;
  valid: (v: string) => boolean;
  message: string;
}[] = [
  {
    key: "courseCode",
    max: 20,
    normalise: (v) => v.toUpperCase().replace(/\s+/g, " "),
    valid: (v) => /^[A-Z0-9 ]+$/.test(v),
    message: "Course code may only use letters, digits and spaces.",
  },
  {
    key: "level",
    max: 10,
    valid: (v) => (SUBMISSION_LEVELS as readonly string[]).includes(v),
    message: `level must be one of: ${SUBMISSION_LEVELS.join(", ")}.`,
  },
  {
    key: "semester",
    max: 20,
    valid: (v) => (SUBMISSION_SEMESTERS as readonly string[]).includes(v),
    message: `semester must be one of: ${SUBMISSION_SEMESTERS.join(", ")}.`,
  },
  {
    key: "academicYear",
    max: 9,
    valid: isAcademicYear,
    message: 'Academic year must look like "2023/2024".',
  },
];

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePermission(request, "admin.view_submissions");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");
    const Material = await getMaterialModel();
    const m = await Material.findById(id)
      .select("title subcategory category pageCount bookId outline isActive source")
      .lean();
    if (!m) return fail(404, "Material not found.");
    return NextResponse.json(
      {
        material: {
          id: String(m._id),
          title: m.title,
          category: m.category,
          subcategory: m.subcategory,
          pageCount: m.pageCount,
          bookId: String(m.bookId),
          isActive: m.isActive,
          isPlatform: m.source === "platform",
          outline: m.outline ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/materials/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "admin.view_submissions");
    await enforceRateLimit(request, "admin", `admin-materials:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") return fail(400, "isActive must be true or false.");
      set.isActive = body.isActive;
    }
    if (body.clearReports !== undefined) {
      if (body.clearReports !== true) return fail(400, "clearReports must be true.");
      set.reportCount = 0;
      unset.hiddenByReports = "";
    }

    const title = optionalString(body.title, 300);
    if (title === null || title === "") return fail(400, "Title must be 1-300 characters.");
    if (title) set.title = title;

    for (const field of CLEARABLE) {
      const raw = optionalString(body[field.key], field.max);
      if (raw === undefined) continue;
      if (raw === null) return fail(400, field.message);
      if (raw === "") {
        unset[field.key] = "";
        continue;
      }
      const value = field.normalise ? field.normalise(raw) : raw;
      if (!field.valid(value)) return fail(400, field.message);
      set[field.key] = value;
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || body.tags.length > MAX_TAGS) {
        return fail(400, `tags must be a list of at most ${MAX_TAGS}.`);
      }
      const tags: string[] = [];
      for (const tag of body.tags) {
        if (typeof tag !== "string" || tag.trim().length > MAX_TAG_LENGTH) {
          return fail(400, `Each tag must be text of at most ${MAX_TAG_LENGTH} characters.`);
        }
        const clean = tag.trim().toLowerCase();
        if (clean && !tags.includes(clean)) tags.push(clean);
      }
      set.tags = tags;
    }

    const Material = await getMaterialModel();
    if (body.outline !== undefined) {
      // The outline's kind and page range come from the material itself
      const current = await Material.findById(id).select("subcategory pageCount").lean();
      if (!current) return fail(404, "Material not found.");
      const parsed = parseOutline(body.outline, current.subcategory, current.pageCount);
      if (!parsed.ok) return fail(400, parsed.message);
      if (parsed.value) set.outline = parsed.value;
      else unset.outline = "";
    }

    const changed = [...Object.keys(set), ...Object.keys(unset)];
    if (changed.length === 0) return fail(400, "Nothing to update.");

    const updated = await Material.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
      { returnDocument: "after", runValidators: true },
    )
      .select(ADMIN_MATERIAL_FIELDS)
      .lean<AdminMaterialDoc>();
    if (!updated) return fail(404, "Material not found.");

    // No audit log model yet; the server log is the trail for now
    console.info(`admin: @${session.upid} updated material ${id}: ${changed.join(", ")}`);
    return NextResponse.json({ material: toAdminMaterialDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/materials/[id]");
  }
}
