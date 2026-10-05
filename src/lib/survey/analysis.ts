// src/lib/survey/analysis.ts
// Survey results: the filters (school, faculty, department, level, role,
// signed in or not, dates, text search), per-question summaries, the
// facets the filter dropdowns offer, the individual responses and the
// export. Summaries are worked out in memory from the matching responses
// (answers only), which is simple and exact at our size; past
// SUMMARY_LIMIT responses they cover the newest ones and say so.
import { Types } from "mongoose";
import { decryptSensitiveData } from "@/lib/encryption";
import { escapeRegex } from "@/lib/escapeRegex";
import { getUserModel } from "@/lib/models/userModel";
import type { ISurvey } from "@/lib/models/surveyModel";
import { getSurveyResponseModel, type ISurveyResponse } from "@/lib/models/surveyResponseModel";
import { RESPONDENT_ROLES, SURVEY_LEVELS, answerText, isChoiceType, type AnswerValue, type SurveyQuestion } from "./questions";
import type { CountRow, QuestionSummary, SurveyFacets, SurveyResponseRow, SurveyResultsResponse } from "@/types/survey";

export const SUMMARY_LIMIT = 50_000;
const LAGOS = "Africa/Lagos";

// --- Filters ------------------------------------------------------------------

export interface ResultFilters {
  /** A university id, or "unlisted" (none from our catalog) */
  school?: string;
  faculty?: string;
  department?: string;
  level?: string;
  role?: string;
  account?: "signed_in" | "anonymous";
  /** YYYY-MM-DD, Lagos time, inclusive */
  from?: string;
  to?: string;
  /** Text search in written answers, "Other" boxes and names */
  q?: string;
}

const OBJECT_ID = /^[a-f0-9]{24}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(params: URLSearchParams): ResultFilters {
  const get = (k: string) => params.get(k)?.trim() || undefined;
  const f: ResultFilters = {};
  const school = get("school");
  if (school && (school === "unlisted" || OBJECT_ID.test(school))) f.school = school;
  const faculty = get("faculty");
  if (faculty && OBJECT_ID.test(faculty)) f.faculty = faculty;
  const department = get("department");
  if (department && OBJECT_ID.test(department)) f.department = department;
  const level = get("level");
  if (level && (SURVEY_LEVELS as readonly string[]).includes(level)) f.level = level;
  const role = get("role");
  if (role && RESPONDENT_ROLES.some((r) => r.value === role)) f.role = role;
  const account = get("account");
  if (account === "signed_in" || account === "anonymous") f.account = account;
  const from = get("from");
  if (from && DAY.test(from)) f.from = from;
  const to = get("to");
  if (to && DAY.test(to)) f.to = to;
  const q = get("q");
  if (q) f.q = q.slice(0, 100);
  return f;
}

/** Midnight in Lagos (UTC+1, no daylight saving) for YYYY-MM-DD. */
const lagosMidnight = (day: string) => new Date(`${day}T00:00:00+01:00`);

export function responseMatch(survey: Pick<ISurvey, "_id" | "questions">, f: ResultFilters): Record<string, unknown> {
  const match: Record<string, unknown> = { surveyId: survey._id };
  if (f.school === "unlisted") match["respondent.universityId"] = { $exists: false };
  else if (f.school) match["respondent.universityId"] = new Types.ObjectId(f.school);
  if (f.faculty) match["respondent.facultyId"] = new Types.ObjectId(f.faculty);
  if (f.department) match["respondent.departmentId"] = new Types.ObjectId(f.department);
  if (f.level) match["respondent.level"] = f.level;
  if (f.role) match["respondent.role"] = f.role;
  if (f.account) match.userId = { $exists: f.account === "signed_in" };
  if (f.from || f.to) {
    match.createdAt = {
      ...(f.from && { $gte: lagosMidnight(f.from) }),
      ...(f.to && { $lt: new Date(lagosMidnight(f.to).getTime() + 86_400_000) }),
    };
  }
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    const or: Record<string, unknown>[] = [{ "respondent.name": rx }];
    for (const q of survey.questions) {
      if (q.type === "short_text" || q.type === "long_text") or.push({ [`answers.${q.id}`]: rx });
      if (q.allowOther) or.push({ [`answers.${q.id}.other`]: rx });
    }
    match.$or = or;
  }
  return match;
}

// --- Summaries ----------------------------------------------------------------

const round = (n: number) => Math.round(n * 100) / 100;

function numericRows(q: SurveyQuestion, values: number[]): CountRow[] {
  if (q.type === "rating" || q.type === "scale") {
    const lo = q.type === "rating" ? 1 : q.min ?? 0;
    const hi = q.type === "rating" ? 5 : q.max ?? 10;
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((n) => ({ key: String(n), label: String(n), count: counts.get(n) ?? 0 }));
  }
  // number: up to 10 equal ranges between the smallest and largest answer
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const distinct = new Set(values);
  if (distinct.size <= 10) {
    return [...distinct].sort((a, b) => a - b).map((n) => ({ key: String(n), label: String(n), count: values.filter((v) => v === n).length }));
  }
  const width = (max - min) / 10;
  const rows = Array.from({ length: 10 }, (_, i) => {
    const a = min + i * width;
    const b = i === 9 ? max : min + (i + 1) * width;
    return { key: String(i), label: `${round(a)} – ${round(b)}`, count: 0 };
  });
  for (const v of values) rows[Math.min(9, Math.floor((v - min) / width))].count += 1;
  return rows;
}

export function summarise(questions: SurveyQuestion[], responses: Pick<ISurveyResponse, "answers">[]): QuestionSummary[] {
  return questions.map((q): QuestionSummary => {
    const values = responses.map((r) => r.answers?.[q.id]).filter((v): v is AnswerValue => v !== undefined && v !== null);
    const answered = values.length;
    const skipped = responses.length - answered;
    const base = { questionId: q.id, answered, skipped };

    if (isChoiceType(q.type)) {
      const counts = new Map<string, number>();
      const otherTexts: string[] = [];
      for (const v of values) {
        if (typeof v !== "object") continue;
        if ("choice" in v) counts.set(v.choice, (counts.get(v.choice) ?? 0) + 1);
        if ("choices" in v) for (const c of v.choices) counts.set(c, (counts.get(c) ?? 0) + 1);
        if ("other" in v && v.other) {
          counts.set("other", (counts.get("other") ?? 0) + 1);
          otherTexts.push(v.other);
        }
      }
      const rows: CountRow[] = (q.options ?? []).map((o) => ({ key: o.id, label: o.label, count: counts.get(o.id) ?? 0 }));
      if (q.allowOther || counts.has("other")) rows.push({ key: "other", label: "Other", count: counts.get("other") ?? 0 });
      return { ...base, kind: "choice", rows, multi: q.type === "multi_choice", otherTexts: otherTexts.slice(-50).reverse() };
    }
    if (q.type === "yes_no") {
      const yes = values.filter((v) => v === true).length;
      return { ...base, kind: "yes_no", rows: [{ key: "yes", label: "Yes", count: yes }, { key: "no", label: "No", count: answered - yes }] };
    }
    if (q.type === "rating" || q.type === "scale" || q.type === "number") {
      const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length === 0 ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const summary: QuestionSummary = {
        ...base,
        kind: "numeric",
        average: nums.length ? round(nums.reduce((a, b) => a + b, 0) / nums.length) : null,
        median: median === null ? null : round(median),
        min: nums.length ? sorted[0] : null,
        max: nums.length ? sorted[sorted.length - 1] : null,
        rows: numericRows(q, nums),
      };
      if (q.type === "scale" && (q.min ?? 0) === 0 && (q.max ?? 10) === 10 && nums.length) {
        const promoters = nums.filter((n) => n >= 9).length;
        const detractors = nums.filter((n) => n <= 6).length;
        summary.nps = {
          promoters,
          passives: nums.length - promoters - detractors,
          detractors,
          score: Math.round(((promoters - detractors) / nums.length) * 100),
        };
      }
      return summary;
    }
    // Text: the newest few here; the responses list has them all
    const texts = values.filter((v): v is string => typeof v === "string");
    return { ...base, kind: "text", latest: texts.slice(-5).reverse() };
  });
}

// --- Facets -------------------------------------------------------------------

async function facets(surveyId: Types.ObjectId, f: ResultFilters): Promise<SurveyFacets> {
  const Response = await getSurveyResponseModel();
  const group = (field: string, label: string, match: Record<string, unknown> = {}) =>
    Response.aggregate<{ _id: unknown; label?: string; count: number }>([
      { $match: { surveyId, ...match } },
      { $group: { _id: `$${field}`, label: { $first: label ? `$${label}` : null }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
    ]);
  // Faculties narrow to the chosen school, departments to the chosen faculty
  const [schools, faculties, departments, levels, roles, accounts] = await Promise.all([
    group("respondent.universityId", "respondent.universityName"),
    f.school && f.school !== "unlisted"
      ? group("respondent.facultyId", "respondent.facultyName", { "respondent.universityId": new Types.ObjectId(f.school) })
      : Promise.resolve([]),
    f.faculty ? group("respondent.departmentId", "respondent.departmentName", { "respondent.facultyId": new Types.ObjectId(f.faculty) }) : Promise.resolve([]),
    group("respondent.level", ""),
    group("respondent.role", ""),
    Response.aggregate<{ _id: boolean; count: number }>([
      { $match: { surveyId } },
      { $group: { _id: { $gt: ["$userId", null] }, count: { $sum: 1 } } },
    ]),
  ]);
  const ids = (rows: { _id: unknown; label?: string; count: number }[], noneLabel?: string) =>
    rows
      .filter((r) => r._id || noneLabel)
      .map((r) => (r._id ? { key: String(r._id), label: r.label || "(unnamed)", count: r.count } : { key: "unlisted", label: noneLabel!, count: r.count }));
  const roleLabel = (v: string) => RESPONDENT_ROLES.find((r) => r.value === v)?.label ?? v;
  return {
    schools: ids(schools, "Not in our list / not given"),
    faculties: ids(faculties),
    departments: ids(departments),
    levels: levels.filter((l) => l._id).map((l) => ({ key: String(l._id), label: String(l._id), count: l.count })),
    roles: roles.filter((r) => r._id).map((r) => ({ key: String(r._id), label: roleLabel(String(r._id)), count: r.count })),
    accounts: accounts.map((a) => ({ key: a._id ? "signed_in" : "anonymous", label: a._id ? "Signed in" : "Signed out", count: a.count })),
  };
}

// --- Results ------------------------------------------------------------------

export async function surveyResults(survey: ISurvey, f: ResultFilters): Promise<SurveyResultsResponse> {
  const Response = await getSurveyResponseModel();
  const match = responseMatch(survey, f);
  const [total, matched, docs, timeline, facetRows] = await Promise.all([
    Response.countDocuments({ surveyId: survey._id }),
    Response.countDocuments(match),
    Response.find(match).sort({ createdAt: -1 }).limit(SUMMARY_LIMIT).select("answers").lean<Pick<ISurveyResponse, "answers">[]>(),
    Response.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: LAGOS } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    facets(survey._id, f),
  ]);
  // Oldest first, so the newest "latest" text answers come out on top
  docs.reverse();
  return {
    total,
    matched,
    summaries: summarise(survey.questions, docs),
    facets: facetRows,
    timeline: timeline.map((t) => ({ day: t._id, count: t.count })),
    truncated: matched > SUMMARY_LIMIT,
  };
}

// --- Individual responses -----------------------------------------------------

function decryptEmail(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return decryptSensitiveData(value);
  } catch {
    return undefined;
  }
}

/** Responses as the results page and the export show them. */
export async function toResponseRows(docs: ISurveyResponse[]): Promise<SurveyResponseRow[]> {
  const userIds = [...new Set(docs.filter((d) => d.userId).map((d) => String(d.userId)))];
  const User = await getUserModel();
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("upid fullName").lean<{ _id: Types.ObjectId; upid: string; fullName: string }[]>()
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return docs.map((d) => {
    const w = d.respondent ?? {};
    const user = d.userId ? byId.get(String(d.userId)) : undefined;
    return {
      id: String(d._id),
      submittedAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
      editCount: d.editCount ?? 0,
      account: d.userId ? { upid: user?.upid ?? "", name: user?.fullName || "Deleted account" } : null,
      respondent: {
        ...(w.name && { name: w.name }),
        ...(w.email && { email: decryptEmail(w.email) }),
        ...(w.role && { role: w.role }),
        ...(w.level && { level: w.level }),
        ...(w.universityName && { school: w.universityAbbr ? `${w.universityName} (${w.universityAbbr})` : w.universityName }),
        ...(w.facultyName && { faculty: w.facultyName }),
        ...(w.departmentName && { department: w.departmentName }),
        ...(w.schoolUnlisted && { schoolUnlisted: true }),
        ...(d.schoolSuggestionId && { awaitingReview: true }),
      },
      answers: d.answers ?? {},
    };
  });
}

export async function listResponses(survey: ISurvey, f: ResultFilters, page: number, limit: number) {
  const Response = await getSurveyResponseModel();
  const match = responseMatch(survey, f);
  const [docs, total] = await Promise.all([
    Response.find(match).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean<ISurveyResponse[]>(),
    Response.countDocuments(match),
  ]);
  return { responses: await toResponseRows(docs), total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// --- Export ---------------------------------------------------------------------

const roleLabel = (v?: string) => (v ? RESPONDENT_ROLES.find((r) => r.value === v)?.label ?? v : "");

/** A CSV cell: quoted, and never a formula when opened in a spreadsheet. */
function cell(value: unknown): string {
  let s = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportHeader(questions: SurveyQuestion[]): string[] {
  return [
    "Response ID",
    "Submitted (UTC)",
    "Last changed (UTC)",
    "Account",
    "Name",
    "Email",
    "Who",
    "Level",
    "School",
    "Faculty",
    "Department",
    "School not in our list",
    ...questions.map((q, i) => `Q${i + 1}. ${q.label}`),
  ];
}

export function exportCsvRow(questions: SurveyQuestion[], r: SurveyResponseRow): string {
  return [
    r.id,
    r.submittedAt,
    r.updatedAt,
    r.account ? `@${r.account.upid}` : "",
    r.respondent.name,
    r.respondent.email,
    roleLabel(r.respondent.role),
    r.respondent.level,
    r.respondent.school,
    r.respondent.faculty,
    r.respondent.department,
    r.respondent.schoolUnlisted ? "yes" : "",
    ...questions.map((q) => answerText(q, r.answers[q.id])),
  ]
    .map(cell)
    .join(",");
}

export const exportCsvHeader = (questions: SurveyQuestion[]) => exportHeader(questions).map(cell).join(",");

/** One response as readable JSON (answers as text, keyed by question). */
export function exportJsonRow(questions: SurveyQuestion[], r: SurveyResponseRow) {
  return {
    id: r.id,
    submittedAt: r.submittedAt,
    updatedAt: r.updatedAt,
    account: r.account ? r.account.upid : null,
    respondent: { ...r.respondent, role: roleLabel(r.respondent.role) || undefined },
    answers: Object.fromEntries(
      questions.map((q) => [q.id, { question: q.label, answer: answerText(q, r.answers[q.id]) || null, raw: r.answers[q.id] ?? null }]),
    ),
  };
}
