// src/lib/survey/surveys.ts
// Server helpers for surveys: cleaning builder input, the slug, and the
// shape the admin API returns.
import type { ISurvey } from "@/lib/models/surveyModel";
import { cleanQuestions, cleanRespondentConfig, lockedChanges, type RespondentConfig, type SurveyQuestion } from "./questions";

export const SURVEY_LIMITS = { title: 150, intro: 3000, thankYou: 1000, slug: 80 } as const;

const text = (v: unknown, max: number, multiline = false) =>
  typeof v === "string"
    ? (multiline ? v.replace(/\r\n?/g, "\n").trim() : v.replace(/\s+/g, " ").trim()).slice(0, max)
    : "";

/** "What do you expect from UniArchive?" -> "what-do-you-expect-from-uniarchive" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, SURVEY_LIMITS.slug)
    .replace(/-+$/g, "");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isValidSlug = (s: string) => SLUG.test(s) && s.length <= SURVEY_LIMITS.slug;

function date(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : undefined;
}

export interface CleanSurvey {
  title: string;
  slug: string;
  intro: string;
  thankYouMessage: string;
  respondentFields: RespondentConfig;
  questions: SurveyQuestion[];
  opensAt: Date | null;
  closesAt: Date | null;
  /** What stops it opening (a draft may still be saved) */
  problems: string[];
}

/**
 * Cleans builder input on top of `current` (fields left out keep their
 * current value). With responses already in, question changes that would
 * alter existing answers are refused: they come back in `locked`.
 */
export function cleanSurveyInput(
  raw: Record<string, unknown>,
  current?: Pick<ISurvey, "title" | "slug" | "intro" | "thankYouMessage" | "respondentFields" | "questions" | "opensAt" | "closesAt" | "responseCount">,
): CleanSurvey & { locked: string[] } {
  const title = raw.title !== undefined ? text(raw.title, SURVEY_LIMITS.title) : current?.title ?? "";
  const slugInput = raw.slug !== undefined ? text(raw.slug, SURVEY_LIMITS.slug).toLowerCase() : current?.slug ?? "";
  const slug = slugInput && isValidSlug(slugInput) ? slugInput : slugify(slugInput || title) || "survey";
  const intro = raw.intro !== undefined ? text(raw.intro, SURVEY_LIMITS.intro, true) : current?.intro ?? "";
  const thankYouMessage =
    raw.thankYouMessage !== undefined ? text(raw.thankYouMessage, SURVEY_LIMITS.thankYou, true) : current?.thankYouMessage ?? "";
  const respondentFields = cleanRespondentConfig(raw.respondentFields ?? current?.respondentFields);
  const { questions, problems } = cleanQuestions(raw.questions !== undefined ? raw.questions : current?.questions ?? []);
  const opensAtIn = date(raw.opensAt);
  const closesAtIn = date(raw.closesAt);
  const opensAt = opensAtIn === undefined ? current?.opensAt ?? null : opensAtIn;
  const closesAt = closesAtIn === undefined ? current?.closesAt ?? null : closesAtIn;

  if (!title) problems.unshift("Give the survey a title.");
  if (opensAt && closesAt && opensAt >= closesAt) problems.push("The survey closes before it opens.");
  const locked = current && current.responseCount > 0 && raw.questions !== undefined ? lockedChanges(current.questions, questions) : [];
  return { title, slug, intro, thankYouMessage, respondentFields, questions, opensAt, closesAt, problems, locked };
}

export interface AdminSurveyDto {
  id: string;
  slug: string;
  title: string;
  intro: string;
  thankYouMessage: string;
  status: ISurvey["status"];
  opensAt?: string;
  closesAt?: string;
  respondentFields: RespondentConfig;
  questions: SurveyQuestion[];
  responseCount: number;
  problems: string[];
  createdBy: { upid: string; name: string };
  updatedBy: { upid: string; name: string };
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

export function toSurveyDto(s: ISurvey): AdminSurveyDto {
  const { problems } = cleanSurveyInput({}, s);
  return {
    id: String(s._id),
    slug: s.slug,
    title: s.title,
    intro: s.intro,
    thankYouMessage: s.thankYouMessage,
    status: s.status,
    ...(s.opensAt && { opensAt: iso(s.opensAt) }),
    ...(s.closesAt && { closesAt: iso(s.closesAt) }),
    respondentFields: cleanRespondentConfig(s.respondentFields),
    questions: s.questions,
    responseCount: s.responseCount ?? 0,
    problems,
    createdBy: { upid: s.createdBy.upid, name: s.createdBy.name },
    updatedBy: { upid: s.updatedBy.upid, name: s.updatedBy.name },
    ...(s.openedAt && { openedAt: iso(s.openedAt) }),
    ...(s.closedAt && { closedAt: iso(s.closedAt) }),
    createdAt: new Date(s.createdAt).toISOString(),
    updatedAt: new Date(s.updatedAt).toISOString(),
  };
}

/** A slug not used by another survey (adds -2, -3...). */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = base;
  for (let n = 2; await exists(slug); n++) slug = `${base.slice(0, SURVEY_LIMITS.slug - 4)}-${n}`;
  return slug;
}
