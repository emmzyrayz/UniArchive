// src/lib/broadcast/drafts.ts
// Server helpers for broadcast drafts: cleaning input from the editor,
// refreshing picked materials from the database, and the API shape.
import { Types } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import type { IBroadcast } from "@/lib/models/broadcastModel";
import type { AdminBroadcastDto } from "@/types/admin";
import type { EmailKind } from "@/lib/emailPrefs";
import { cleanAudience, type BroadcastAudience } from "./audience";
import {
  broadcastKind,
  cleanFields,
  getTemplate,
  renderBroadcast,
  type MaterialRef,
  type TemplateDef,
  type TemplateFields,
} from "./templates";

export const NAME_MAX = 120;

export interface CleanDraft {
  template: TemplateDef;
  name: string;
  kind: EmailKind;
  fields: TemplateFields;
  audience: BroadcastAudience;
  subject: string;
  problems: string[];
}

/**
 * Replaces each picked material's title/course/school with the database's
 * current values; materials that no longer exist or were deactivated are
 * dropped (and reported).
 */
async function refreshMaterials(fields: TemplateFields, problems: string[]): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    if (!Array.isArray(value) || value.length === 0 || typeof value[0] !== "object") continue;
    const refs = value as MaterialRef[];
    const Material = await getMaterialModel();
    const docs = await Material.find({ _id: { $in: refs.map((r) => new Types.ObjectId(r.id)) }, isActive: true })
      .select("title courseCode universityAbbr universityName")
      .lean<{ _id: Types.ObjectId; title: string; courseCode?: string; universityAbbr?: string; universityName?: string }[]>();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const kept: MaterialRef[] = [];
    for (const ref of refs) {
      const d = byId.get(ref.id);
      if (!d) continue;
      const school = d.universityAbbr || d.universityName;
      kept.push({ id: ref.id, title: d.title, ...(d.courseCode && { courseCode: d.courseCode }), ...(school && { school }) });
    }
    if (kept.length < refs.length) {
      problems.push(`${refs.length - kept.length} picked material(s) no longer exist and were removed.`);
    }
    fields[name] = kept;
  }
}

/** Validates editor input. Returns null when the template is unknown. */
export async function cleanDraft(input: {
  templateId?: unknown;
  name?: unknown;
  kind?: unknown;
  fields?: unknown;
  audience?: unknown;
}): Promise<CleanDraft | null> {
  const template = getTemplate(input.templateId);
  if (!template) return null;
  const { fields, problems } = cleanFields(template, input.fields);
  await refreshMaterials(fields, problems);
  // cleanFields counted missing materials before the refresh; recount
  const materialsField = template.fields.find((f) => f.type === "materials");
  if (materialsField?.required && Array.isArray(fields[materialsField.name]) && (fields[materialsField.name] as MaterialRef[]).length === 0) {
    if (!problems.includes("Pick at least one material.")) problems.push("Pick at least one material.");
  }
  const { audience, problems: audienceProblems } = cleanAudience(input.audience);
  const kind = broadcastKind(template, input.kind);
  const name =
    (typeof input.name === "string" ? input.name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "") ||
    `${template.label} draft`;
  return {
    template,
    name,
    kind,
    fields,
    audience,
    subject: renderBroadcast(template, fields, kind).subject,
    problems: [...problems, ...audienceProblems],
  };
}

/** What stops a stored broadcast from being sent (re-checked on read). */
export function broadcastProblems(b: Pick<IBroadcast, "templateId" | "fields" | "audience">): string[] {
  const template = getTemplate(b.templateId);
  if (!template) return ["This broadcast uses a template that no longer exists."];
  return [...cleanFields(template, b.fields).problems, ...cleanAudience(b.audience).problems];
}

const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

export function toBroadcastDto(b: IBroadcast): AdminBroadcastDto {
  return {
    id: String(b._id),
    name: b.name,
    templateId: b.templateId,
    kind: b.kind,
    fields: b.fields,
    subject: b.subject,
    audience: cleanAudience(b.audience).audience,
    status: b.status,
    problems: b.status === "draft" ? broadcastProblems(b) : [],
    createdBy: { upid: b.createdBy.upid, name: b.createdBy.name },
    updatedBy: { upid: b.updatedBy.upid, name: b.updatedBy.name },
    ...(b.lastTestAt && { lastTestAt: iso(b.lastTestAt) }),
    ...(b.recipientCount !== undefined && { recipientCount: b.recipientCount }),
    ...(b.scheduledAt && { scheduledAt: iso(b.scheduledAt) }),
    ...(b.sentAt && { sentAt: iso(b.sentAt) }),
    ...(b.error && { error: b.error }),
    // The schema keeps empty objects (minimize: false), so stats is {} until
    // Brevo's numbers are first fetched
    ...(b.stats?.updatedAt && { stats: { ...b.stats, updatedAt: new Date(b.stats.updatedAt).toISOString() } }),
    createdAt: new Date(b.createdAt).toISOString(),
    updatedAt: new Date(b.updatedAt).toISOString(),
  };
}
