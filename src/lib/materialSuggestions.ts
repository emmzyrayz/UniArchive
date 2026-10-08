// src/lib/materialSuggestions.ts
// "Help identify this PDF": readers suggest the details of an unverified
// material. A suggestion is validated exactly like a submission
// (parseSubmissionBody + resolveAcademicRefs), so staff can accept it as is.
// Agreeing suggestions share a fingerprint (category, course code, school,
// level), which is how "3 people say MTH101 · UNIZIK · 100" is counted.
import { Types } from "mongoose";
import { parseSubmissionBody, resolveAcademicRefs, type SubmissionBody } from "@/lib/submissions";
import { categoryLabel } from "@/components/admin/reviewShared";
import {
  getMaterialSuggestionModel,
  type IMaterialSuggestion,
  type MaterialSuggestionFields,
} from "@/lib/models/materialSuggestionModel";
import type { SuggestionFieldsDto, SuggestionGroupDto } from "@/types/unilibrary";
import { awardBadgesAfter } from "@/lib/badges";
import { getMaterialModel, type IMaterial } from "@/lib/models/materialModel";
import { notifyAfter } from "@/lib/notifications";
import { earn } from "@/lib/economy/earn";

/** Validates a suggestion; throws the same 400/404 responses as a submission. */
export async function parseSuggestion(body: Partial<SubmissionBody> | null): Promise<MaterialSuggestionFields> {
  const input = parseSubmissionBody(body ? { ...body, action: "submit" } : null);
  if (!input.institution.universityId) {
    throw Response.json({ message: "Choose the university this material is for." }, { status: 400 });
  }
  if (!input.title) throw Response.json({ message: "Give it a title." }, { status: 400 });
  const refs = await resolveAcademicRefs(input.institution);
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    tags: input.tags,
    ...refs,
    courseCode: input.courseCode,
    courseName: input.courseName,
    level: input.level,
    semester: input.semester,
    academicYear: input.academicYear,
  };
}

const norm = (v?: string | Types.ObjectId) => (v ? String(v).trim().toLowerCase().replace(/\s+/g, "") : "");

export function suggestionFingerprint(f: MaterialSuggestionFields): string {
  return [f.category, f.courseCode, f.universityId ?? f.universityName, f.level].map(norm).join("|");
}

export function toSuggestionFieldsDto(f: Partial<MaterialSuggestionFields> | Partial<IMaterial>): SuggestionFieldsDto {
  const id = (v: unknown) => (v ? String(v) : undefined);
  return {
    title: f.title ?? "",
    description: f.description ?? "",
    category: f.category ?? "",
    tags: f.tags ?? [],
    ...(f.subcategory && { subcategory: f.subcategory }),
    ...(f.universityId && { universityId: id(f.universityId), universityName: f.universityName, universityAbbr: f.universityAbbr }),
    ...(f.facultyId && { facultyId: id(f.facultyId), facultyName: f.facultyName }),
    ...(f.departmentId && { departmentId: id(f.departmentId), departmentName: f.departmentName }),
    ...(f.courseCode && { courseCode: f.courseCode }),
    ...(f.courseName && { courseName: f.courseName }),
    ...(f.level && { level: f.level }),
    ...(f.semester && { semester: f.semester }),
    ...(f.academicYear && { academicYear: f.academicYear }),
  };
}

function summary(f: MaterialSuggestionFields): string {
  return [categoryLabel(f.category, f.subcategory), f.courseCode, f.universityAbbr || f.universityName, f.level && `${f.level}${/^\d+$/.test(f.level) ? "L" : ""}`]
    .filter(Boolean)
    .join(" · ");
}

/** Pending suggestions for a material, grouped by agreement (biggest group first). */
export async function suggestionGroups(materialId: Types.ObjectId): Promise<SuggestionGroupDto[]> {
  const Suggestion = await getMaterialSuggestionModel();
  const docs = await Suggestion.find({ materialId, status: "pending" }).sort({ updatedAt: -1 }).lean<IMaterialSuggestion[]>();
  const groups = new Map<string, IMaterialSuggestion[]>();
  for (const d of docs) groups.set(d.fingerprint, [...(groups.get(d.fingerprint) ?? []), d]);
  return [...groups.entries()]
    .map(([fingerprint, list]) => ({
      fingerprint,
      summary: summary(list[0].fields),
      count: list.length,
      fields: toSuggestionFieldsDto(list[0].fields),
      suggestions: list.map((s) => ({
        id: String(s._id),
        upid: s.userUpid,
        createdAt: new Date(s.updatedAt).toISOString(),
        fields: toSuggestionFieldsDto(s.fields),
      })),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The pending suggestion `suggestionId` for `materialId`, to verify with.
 * Throws a 400/404 Response like the routes' other checks.
 */
export async function loadAcceptableSuggestion(
  materialId: Types.ObjectId,
  suggestionId: unknown,
): Promise<IMaterialSuggestion> {
  if (typeof suggestionId !== "string" || !Types.ObjectId.isValid(suggestionId)) {
    throw Response.json({ message: "suggestionId is not valid." }, { status: 400 });
  }
  const Suggestion = await getMaterialSuggestionModel();
  const suggestion = await Suggestion.findOne({ _id: suggestionId, materialId, status: "pending" }).lean<IMaterialSuggestion>();
  if (!suggestion) throw Response.json({ message: "That suggestion isn't pending for this PDF any more." }, { status: 404 });
  return suggestion;
}

/**
 * The material was verified: the suggestion staff used (and every one that
 * agrees with it) is accepted and its authors credited; the rest are
 * declined. Without `accepted`, all pending ones are declined.
 */
export async function settleSuggestions(materialId: Types.ObjectId, accepted?: IMaterialSuggestion): Promise<void> {
  const Suggestion = await getMaterialSuggestionModel();
  const now = new Date();
  const material = await (await getMaterialModel()).findById(materialId).select("title").lean<Pick<IMaterial, "title">>();
  const title = material?.title ?? "a PDF";
  const link = `/materials/${String(materialId)}`;
  const acceptedUsers = new Set<string>();
  if (accepted) {
    const agreeing = await Suggestion.find({ materialId, status: "pending", fingerprint: accepted.fingerprint })
      .select("_id userId")
      .lean();
    const ids = [...new Set([String(accepted._id), ...agreeing.map((s) => String(s._id))])];
    await Suggestion.updateMany({ _id: { $in: ids }, status: "pending" }, { $set: { status: "accepted", decidedAt: now } });
    for (const userId of [String(accepted.userId), ...agreeing.map((s) => String(s.userId))]) acceptedUsers.add(userId);
    // Archive Scouts: each accepted suggestion pays (once, by suggestion id)
    const paid = [{ _id: accepted._id, userId: accepted.userId }, ...agreeing];
    for (const s of paid) {
      await earn(s.userId, "scouts.identify", `scouts.identify:${String(s._id)}`, {
        meta: { materialId: String(materialId) },
      }).catch((error) => console.error(`[suggestions] paying ${String(s._id)} failed:`, error));
    }
    for (const userId of acceptedUsers) {
      awardBadgesAfter(userId, "suggestion_accepted");
      notifyAfter(userId, {
        type: "suggestion_accepted",
        title: "Your details for a PDF were right",
        body: `Our team verified "${title}" with the details you suggested. Thanks for helping identify it: credits are in your wallet.`,
        link,
        dedupeKey: `suggestion:${String(materialId)}`,
      });
    }
  }
  const declined = await Suggestion.find({ materialId, status: "pending" }).select("userId").lean();
  await Suggestion.updateMany({ materialId, status: "pending" }, { $set: { status: "declined", decidedAt: now } });
  for (const userId of new Set(declined.map((s) => String(s.userId)))) {
    if (acceptedUsers.has(userId)) continue;
    notifyAfter(userId, {
      type: "suggestion_declined",
      title: "A PDF you helped with was identified",
      body: `"${title}" was verified with different details from the ones you suggested. Have a look at what it turned out to be.`,
      link,
      dedupeKey: `suggestion:${String(materialId)}`,
    });
  }
}

/** The details a submission takes from an accepted suggestion. */
export function submissionFieldsFrom(s: IMaterialSuggestion) {
  const f = s.fields;
  return {
    title: f.title,
    description: f.description,
    category: f.category,
    subcategory: f.subcategory,
    tags: f.tags ?? [],
    universityId: f.universityId,
    universityName: f.universityName,
    universityAbbr: f.universityAbbr,
    facultyId: f.facultyId,
    facultyName: f.facultyName,
    departmentId: f.departmentId,
    departmentName: f.departmentName,
    courseCode: f.courseCode,
    courseName: f.courseName,
    level: f.level,
    semester: f.semester,
    academicYear: f.academicYear,
  };
}
