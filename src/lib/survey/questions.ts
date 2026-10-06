// src/lib/survey/questions.ts
// Survey questions and answers: the one place that defines what a question
// can be, what a valid answer is, and which "about you" fields a survey
// asks. Client-safe: the admin builder, the public form and the APIs all
// use it, so the form and the server can't disagree.
//
// Choices are stored by option id, not text, so fixing a typo in an option
// after responses arrive doesn't break the results.

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "dropdown",
  "yes_no",
  "rating",
  "scale",
  "number",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  long_text: "Paragraph",
  single_choice: "Multiple choice (pick one)",
  multi_choice: "Checkboxes (pick any)",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
  rating: "Rating (1-5 stars)",
  scale: "Scale (e.g. 0-10)",
  number: "Number",
};

const CHOICE_TYPES: QuestionType[] = ["single_choice", "multi_choice", "dropdown"];
export const isChoiceType = (t: QuestionType) => CHOICE_TYPES.includes(t);

export interface QuestionOption {
  id: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required: boolean;
  /** single_choice, multi_choice, dropdown */
  options?: QuestionOption[];
  /** single_choice, multi_choice: an "Other: ___" box */
  allowOther?: boolean;
  /** scale (default 0-10) and number (optional bounds) */
  min?: number;
  max?: number;
  /** scale: words under the two ends */
  minLabel?: string;
  maxLabel?: string;
}

export const LIMITS = {
  questions: 50,
  options: 30,
  label: 300,
  help: 500,
  option: 150,
  shortText: 300,
  longText: 5000,
  other: 200,
  scaleLabel: 40,
} as const;

/** A random id for a new question or option (stable once saved). */
export function newId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const ID = /^[a-z0-9]{6,24}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : typeof v === "string" && /^-?\d+$/.test(v) ? Number(v) : undefined);

/** Cleans the builder's questions; `problems` lists what stops it opening. */
export function cleanQuestions(raw: unknown): { questions: SurveyQuestion[]; problems: string[] } {
  const problems: string[] = [];
  const list = Array.isArray(raw) ? raw.slice(0, LIMITS.questions) : [];
  const ids = new Set<string>();
  const questions: SurveyQuestion[] = [];
  list.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const q = item as Record<string, unknown>;
    const n = i + 1;
    const type = QUESTION_TYPES.includes(q.type as QuestionType) ? (q.type as QuestionType) : "short_text";
    let id = typeof q.id === "string" && ID.test(q.id) ? q.id : newId();
    while (ids.has(id)) id = newId();
    ids.add(id);
    const label = str(q.label, LIMITS.label);
    if (!label) problems.push(`Question ${n} needs a question.`);
    const out: SurveyQuestion = { id, type, label, required: q.required === true };
    const help = str(q.help, LIMITS.help);
    if (help) out.help = help;

    if (isChoiceType(type)) {
      const optIds = new Set<string>();
      const options: QuestionOption[] = [];
      for (const o of Array.isArray(q.options) ? q.options.slice(0, LIMITS.options) : []) {
        if (!o || typeof o !== "object") continue;
        const opt = o as Record<string, unknown>;
        const text = str(opt.label, LIMITS.option);
        if (!text) continue;
        let oid = typeof opt.id === "string" && ID.test(opt.id) ? opt.id : newId();
        while (optIds.has(oid)) oid = newId();
        optIds.add(oid);
        options.push({ id: oid, label: text });
      }
      if (options.length < 2) problems.push(`Question ${n} needs at least two options.`);
      out.options = options;
      if (type !== "dropdown" && q.allowOther === true) out.allowOther = true;
    }
    if (type === "scale") {
      const min = int(q.min) ?? 0;
      const max = int(q.max) ?? 10;
      if (min < 0 || max > 10 || max - min < 1) problems.push(`Question ${n}: the scale must go from 0 or more up to 10 at most.`);
      out.min = Math.max(0, Math.min(min, 9));
      out.max = Math.min(10, Math.max(max, out.min + 1));
      const minLabel = str(q.minLabel, LIMITS.scaleLabel);
      const maxLabel = str(q.maxLabel, LIMITS.scaleLabel);
      if (minLabel) out.minLabel = minLabel;
      if (maxLabel) out.maxLabel = maxLabel;
    }
    if (type === "number") {
      const min = int(q.min);
      const max = int(q.max);
      if (min !== undefined) out.min = min;
      if (max !== undefined) out.max = max;
      if (min !== undefined && max !== undefined && min > max) problems.push(`Question ${n}: the smallest number is above the largest.`);
    }
    questions.push(out);
  });
  if (questions.length === 0) problems.push("Add at least one question.");
  return { questions, problems };
}

/**
 * Questions pasted into the builder as JSON (README "Writing survey
 * questions"): an array, `{ "questions": [...] }`, or either inside
 * ```json blocks (several blocks are joined), as AI tools tend to answer.
 * Pasted ids are dropped so a copy never clashes with existing questions.
 */
export function parseQuestionImport(text: string): { questions: SurveyQuestion[]; problems: string[]; error?: string } {
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  const items: unknown[] = [];
  for (const block of blocks.length ? blocks : [text]) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.trim());
    } catch {
      return { questions: [], problems: [], error: "That isn't valid JSON. Paste the array of questions (or the ```json block) exactly as given." };
    }
    const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown })?.questions;
    if (!Array.isArray(list)) return { questions: [], problems: [], error: "Expected a list of questions: [ { \"type\": ..., \"label\": ... } ]." };
    items.push(...list);
  }
  if (items.length === 0) return { questions: [], problems: [], error: "No questions found." };
  if (items.length > LIMITS.questions) {
    return { questions: [], problems: [], error: `That's ${items.length} questions; a survey takes ${LIMITS.questions} at most. Split them into several surveys.` };
  }
  const unknownTypes = items.filter((q) => !QUESTION_TYPES.includes((q as { type?: QuestionType })?.type as QuestionType)).length;
  const stripped = items.map((q) => {
    if (!q || typeof q !== "object") return q;
    const rest = { ...(q as Record<string, unknown>) };
    delete rest.id;
    if (Array.isArray(rest.options)) {
      rest.options = rest.options.map((o) => (o && typeof o === "object" ? { label: (o as { label?: unknown }).label } : { label: o }));
    }
    return rest;
  });
  const { questions, problems } = cleanQuestions(stripped);
  if (unknownTypes) problems.unshift(`${unknownTypes} question(s) had an unknown type and became short answers.`);
  return { questions, problems };
}

// --- Answers ------------------------------------------------------------------

/** What an answer looks like, per type. */
export type AnswerValue =
  | string // short_text, long_text
  | { choice: string } // single_choice, dropdown (an option id)
  | { other: string } // single_choice "Other"
  | { choices: string[]; other?: string } // multi_choice
  | boolean // yes_no
  | number; // rating, scale, number

export type Answers = Record<string, AnswerValue>;

const isBlank = (v: unknown) =>
  v === undefined ||
  v === null ||
  (typeof v === "string" && !v.trim()) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/**
 * Validates answers against the questions. Unknown questions are dropped,
 * blank optional ones left out. `errors` is keyed by question id.
 */
export function cleanAnswers(questions: SurveyQuestion[], raw: unknown): { answers: Answers; errors: Record<string, string> } {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const v = input[q.id];
    const required = () => {
      if (q.required) errors[q.id] = "This question needs an answer.";
    };
    switch (q.type) {
      case "short_text":
      case "long_text": {
        const max = q.type === "short_text" ? LIMITS.shortText : LIMITS.longText;
        const text = typeof v === "string" ? (q.type === "short_text" ? v.replace(/\s+/g, " ") : v.replace(/\r\n?/g, "\n")).trim() : "";
        if (!text) required();
        else if (text.length > max) errors[q.id] = `Keep it under ${max.toLocaleString()} characters.`;
        else answers[q.id] = text;
        break;
      }
      case "single_choice":
      case "dropdown": {
        if (isBlank(v)) {
          required();
          break;
        }
        const o = v as Record<string, unknown>;
        if (typeof o.choice === "string" && q.options?.some((x) => x.id === o.choice)) answers[q.id] = { choice: o.choice };
        else if (q.allowOther && typeof o.other === "string" && o.other.trim()) answers[q.id] = { other: str(o.other, LIMITS.other) };
        else errors[q.id] = "Pick one of the options.";
        break;
      }
      case "multi_choice": {
        const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
        const picked = Array.isArray(o.choices)
          ? [...new Set(o.choices.filter((c): c is string => typeof c === "string" && !!q.options?.some((x) => x.id === c)))]
          : [];
        const other = q.allowOther && typeof o.other === "string" ? str(o.other, LIMITS.other) : "";
        if (picked.length === 0 && !other) required();
        else answers[q.id] = other ? { choices: picked, other } : { choices: picked };
        break;
      }
      case "yes_no":
        if (typeof v === "boolean") answers[q.id] = v;
        else if (isBlank(v)) required();
        else errors[q.id] = "Answer yes or no.";
        break;
      case "rating":
      case "scale":
      case "number": {
        if (isBlank(v)) {
          required();
          break;
        }
        const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
        const min = q.type === "rating" ? 1 : q.type === "scale" ? q.min ?? 0 : q.min;
        const max = q.type === "rating" ? 5 : q.type === "scale" ? q.max ?? 10 : q.max;
        if (!Number.isFinite(n) || ((q.type === "rating" || q.type === "scale") && !Number.isInteger(n))) {
          errors[q.id] = "Enter a number.";
        } else if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
          errors[q.id] = `Enter a number from ${min ?? "…"} to ${max ?? "…"}.`;
        } else answers[q.id] = n;
        break;
      }
    }
  }
  return { answers, errors };
}

/** An answer as readable text (results, export). */
export function answerText(q: SurveyQuestion, v: AnswerValue | undefined): string {
  if (v === undefined) return "";
  const label = (id: string) => q.options?.find((o) => o.id === id)?.label ?? "(removed option)";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number" || typeof v === "string") return String(v);
  if ("choice" in v) return label(v.choice);
  if ("choices" in v) return [...v.choices.map(label), ...(v.other ? [`Other: ${v.other}`] : [])].join("; ");
  if ("other" in v) return `Other: ${v.other}`;
  return "";
}

// --- "About you" (respondent) fields -------------------------------------------

export const RESPONDENT_FIELDS = ["name", "email", "school", "level", "role"] as const;
export type RespondentField = (typeof RESPONDENT_FIELDS)[number];
export type FieldMode = "off" | "optional" | "required";
export type RespondentConfig = Record<RespondentField, FieldMode>;

export const RESPONDENT_FIELD_LABELS: Record<RespondentField, string> = {
  name: "Name",
  email: "Email (for follow-up)",
  school: "School, faculty and department",
  level: "Level",
  role: "Who they are (student, graduate, lecturer...)",
};

export const DEFAULT_RESPONDENT_CONFIG: RespondentConfig = {
  name: "optional",
  email: "optional",
  school: "required",
  level: "optional",
  role: "required",
};

export const RESPONDENT_ROLES = [
  { value: "student", label: "Student" },
  { value: "graduate", label: "Graduate" },
  { value: "lecturer", label: "Lecturer / staff" },
  { value: "aspiring", label: "Preparing for university" },
  { value: "other", label: "Other" },
] as const;

export const SURVEY_LEVELS = ["100L", "200L", "300L", "400L", "500L", "600L", "PG"] as const;

export function cleanRespondentConfig(raw: unknown): RespondentConfig {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_RESPONDENT_CONFIG };
  for (const f of RESPONDENT_FIELDS) {
    if (input[f] === "off" || input[f] === "optional" || input[f] === "required") out[f] = input[f] as FieldMode;
  }
  return out;
}

export interface RespondentInput {
  name?: string;
  email?: string;
  /**
   * Catalog ids for the parts that are listed, typed names for the ones
   * that aren't. Typed parts go to the school-suggestion queue, so a typed
   * part needs the parts below it.
   */
  universityId?: string;
  universityName?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  schoolUnlisted?: boolean;
  level?: string;
  role?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID = /^[a-f0-9]{24}$/;
// Same rule as school suggestions (api/institutions/suggest)
const NAME_PATTERN = /^[\p{L}\p{N}\s.,'’&()\-/]+$/u;

/** Validates the "about you" part; `errors` keyed by field. */
export function cleanRespondent(config: RespondentConfig, raw: unknown): { respondent: RespondentInput; errors: Record<string, string> } {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: RespondentInput = {};
  const errors: Record<string, string> = {};
  const need = (f: RespondentField, ok: boolean, message: string) => {
    if (config[f] === "required" && !ok) errors[f] = message;
  };
  if (config.name !== "off") {
    const name = str(input.name, 100);
    if (name) out.name = name;
    need("name", !!name, "Enter your name.");
  }
  if (config.email !== "off") {
    const email = str(input.email, 254).toLowerCase();
    if (email && !EMAIL.test(email)) errors.email = "Enter a valid email, or leave it empty.";
    else if (email) out.email = email;
    need("email", !!out.email, "Enter your email.");
  }
  if (config.school !== "off") {
    const id = (v: unknown) => (typeof v === "string" && OBJECT_ID.test(v) ? v : undefined);
    const unlisted = input.schoolUnlisted === true;
    const uni = str(input.universityName, 150);
    const faculty = str(input.facultyName, 150);
    const department = str(input.departmentName, 150);
    const universityId = unlisted ? undefined : id(input.universityId);
    const facultyId = universityId ? id(input.facultyId) : undefined;
    const departmentId = facultyId ? id(input.departmentId) : undefined;
    if (universityId) out.universityId = universityId;
    if (facultyId) out.facultyId = facultyId;
    if (departmentId) out.departmentId = departmentId;
    if (uni) out.universityName = uni;
    if (faculty) out.facultyName = faculty;
    if (department) out.departmentName = department;
    if (unlisted && uni) out.schoolUnlisted = true;
    need("school", !!(universityId || out.schoolUnlisted), "Pick your school, or type it if it isn't listed.");
    // A typed school or faculty goes for review, which needs what's below it
    const typedSchool = !!out.schoolUnlisted;
    const typedFaculty = !!universityId && !facultyId && !!faculty;
    if ((typedSchool || typedFaculty) && (!faculty || !department)) {
      errors.school = "Add your faculty and department too, so we can add them to UniArchive.";
    }
    for (const [part, value] of [["school", uni], ["faculty", faculty], ["department", department]] as const) {
      if (value && !NAME_PATTERN.test(value)) errors.school = `The ${part} name has characters that aren't allowed.`;
    }
  }
  if (config.level !== "off") {
    const level = SURVEY_LEVELS.includes(input.level as (typeof SURVEY_LEVELS)[number]) ? (input.level as string) : "";
    if (level) out.level = level;
    need("level", !!level, "Pick your level.");
  }
  if (config.role !== "off") {
    const role = RESPONDENT_ROLES.some((r) => r.value === input.role) ? (input.role as string) : "";
    if (role) out.role = role;
    need("role", !!role, "Tell us who you are.");
  }
  return { respondent: out, errors };
}

/**
 * Once a survey has responses, its questions may only get new wording,
 * new options and new optional questions: nothing that would change what
 * existing answers mean. Returns the problems with `next`.
 */
export function lockedChanges(prev: SurveyQuestion[], next: SurveyQuestion[]): string[] {
  const problems: string[] = [];
  const byId = new Map(next.map((q) => [q.id, q]));
  for (const p of prev) {
    const n = byId.get(p.id);
    if (!n) {
      problems.push(`"${p.label}" already has answers and can't be removed.`);
      continue;
    }
    if (n.type !== p.type) problems.push(`"${p.label}" already has answers; its type can't change.`);
    const nextOptions = new Set((n.options ?? []).map((o) => o.id));
    if ((p.options ?? []).some((o) => !nextOptions.has(o.id))) problems.push(`"${p.label}" already has answers; options can be renamed or added, not removed.`);
    if (p.type === "scale" && (n.min !== p.min || n.max !== p.max)) problems.push(`"${p.label}" already has answers; its scale can't change.`);
  }
  const prevIds = new Set(prev.map((q) => q.id));
  for (const n of next) {
    if (!prevIds.has(n.id) && n.required) problems.push(`New question "${n.label}" must be optional (people already answered without it).`);
  }
  return problems;
}
