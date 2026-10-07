// src/lib/broadcast/templates.ts
// The broadcast templates (/admin/mail/broadcasts), after the registry in
// the diuscadi project: each template declares its fields (the editor form
// is generated from them), the kind of bulk email it is (which decides who
// may receive it, see lib/emailPrefs.ts) and a renderer. The same code
// renders the live preview, the test copy and the email Brevo sends, so it
// stays free of server imports.
//
// Unlike diuscadi, every value is escaped, links must be https, and there is
// no raw-HTML template ("Custom message" takes plain text).
//
// The rendered email carries Brevo merge tags, filled in per recipient:
//   {{ contact.FIRSTNAME|default:"there" }}      greeting
//   {{ contact.PREFS_URL }}                      their /email-preferences link
//   {{ unsubscribe }}                            Brevo's unsubscribe link
// personalize() fills them for the preview and the test copy.
import { absoluteUrl } from "@/lib/seo";
import { emailFrame, escapeHtml, linkify, plainTextToHtml } from "@/lib/emailLayout";
import type { EmailKind } from "@/lib/emailPrefs";

// --- Field model ------------------------------------------------------------

export interface MaterialRef {
  id: string;
  title: string;
  courseCode?: string;
  school?: string;
}

export type FieldType = "text" | "textarea" | "lines" | "url" | "select" | "checkbox" | "materials";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Characters for text fields, items for lines/materials */
  max: number;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Pre-filled when a draft starts */
  initial?: string | boolean;
}

export type FieldValue = string | boolean | string[] | MaterialRef[];
export type TemplateFields = Record<string, FieldValue>;

export type BroadcastTemplateId =
  | "general_announcement"
  | "platform_update"
  | "urgent_notice"
  | "custom_message"
  | "new_materials"
  | "exam_season"
  | "contributor_call"
  | "survey_invite"
  | "monthly_digest"
  | "profile_nudge";

export interface TemplateDef {
  id: BroadcastTemplateId;
  label: string;
  emoji: string;
  description: string;
  /** The kind of bulk email; "choose" lets the author pick (custom message) */
  kind: EmailKind | "choose";
  fields: FieldDef[];
  /** Audience criteria a new draft starts with (e.g. incomplete profiles) */
  audience?: { incompleteProfileOnly?: boolean };
}

export interface RenderedBroadcast {
  subject: string;
  html: string;
  text: string;
}

// Every template ends with an optional subject override and a button
const SUBJECT: FieldDef = {
  name: "subject",
  label: "Subject (optional)",
  type: "text",
  max: 150,
  help: "Leave empty to use the headline.",
};
const CTA = (label = "", url = ""): FieldDef[] => [
  { name: "ctaLabel", label: "Button text", type: "text", max: 40, placeholder: "Open UniArchive", initial: label },
  { name: "ctaUrl", label: "Button link", type: "url", max: 500, placeholder: "https://uniarchive.com.ng/...", initial: url },
];

export const BROADCAST_TEMPLATES: TemplateDef[] = [
  {
    id: "general_announcement",
    label: "Announcement",
    emoji: "📢",
    description: "A general message with an optional list and button.",
    kind: "announcements",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120 },
      { name: "body", label: "Message", type: "textarea", required: true, max: 5000 },
      { name: "bullets", label: "List (one item per line)", type: "lines", max: 10 },
      ...CTA(),
      SUBJECT,
    ],
  },
  {
    id: "platform_update",
    label: "Platform update",
    emoji: "✨",
    description: "A new feature, planned maintenance or an important change.",
    kind: "announcements",
    fields: [
      {
        name: "updateType",
        label: "Type",
        type: "select",
        required: true,
        max: 20,
        options: [
          { value: "feature", label: "New feature" },
          { value: "maintenance", label: "Planned maintenance" },
          { value: "important", label: "Important change" },
        ],
        initial: "feature",
      },
      { name: "title", label: "Title", type: "text", required: true, max: 120 },
      { name: "description", label: "Description", type: "textarea", required: true, max: 5000 },
      { name: "startsAt", label: "Starts (optional)", type: "text", max: 80, placeholder: "Saturday 12 October, 10:00 PM WAT" },
      { name: "endsAt", label: "Ends (optional)", type: "text", max: 80, placeholder: "Sunday 13 October, 2:00 AM WAT" },
      { name: "affected", label: "Affected features (one per line)", type: "lines", max: 10 },
      { name: "actionRequired", label: "Students need to do something", type: "checkbox", max: 1 },
      ...CTA(),
      SUBJECT,
    ],
  },
  {
    id: "urgent_notice",
    label: "Urgent notice",
    emoji: "🚨",
    description: "Time-sensitive news. Still only reaches people who get announcements.",
    kind: "announcements",
    fields: [
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        max: 20,
        options: [
          { value: "critical", label: "Critical" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
        ],
        initial: "high",
      },
      { name: "headline", label: "Headline", type: "text", required: true, max: 120 },
      { name: "body", label: "Message", type: "textarea", required: true, max: 5000 },
      ...CTA(),
      SUBJECT,
    ],
  },
  {
    id: "custom_message",
    label: "Custom message",
    emoji: "✏️",
    description: "Plain text with a subject, for anything the others don't fit.",
    kind: "choose",
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, max: 150 },
      {
        name: "body",
        label: "Message",
        type: "textarea",
        required: true,
        max: 10000,
        help: "Plain text. Leave a blank line between paragraphs; links become clickable.",
      },
    ],
  },
  {
    id: "new_materials",
    label: "New in the UniLibrary",
    emoji: "📚",
    description: "Highlight materials from the library; each links to its page.",
    kind: "newsletter",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "New in the UniLibrary" },
      { name: "intro", label: "Introduction", type: "textarea", required: true, max: 2000 },
      { name: "materials", label: "Materials", type: "materials", required: true, max: 12 },
      { name: "outro", label: "Closing note (optional)", type: "textarea", max: 1000 },
      ...CTA("Browse the UniLibrary", absoluteUrl("/unilibrary")),
      SUBJECT,
    ],
  },
  {
    id: "exam_season",
    label: "Exam season",
    emoji: "📝",
    description: "Exam prep: dates, tips and a link to past questions.",
    kind: "newsletter",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "Exams are coming: get ready with past questions" },
      { name: "intro", label: "Introduction", type: "textarea", required: true, max: 2000 },
      { name: "examPeriod", label: "Exam period (optional)", type: "text", max: 80, placeholder: "4 - 22 November" },
      { name: "tips", label: "Tips (one per line)", type: "lines", max: 8 },
      ...CTA("Find past questions", absoluteUrl("/unilibrary")),
      SUBJECT,
    ],
  },
  {
    id: "contributor_call",
    label: "Call for contributors",
    emoji: "🤝",
    description: "Ask students to upload or type out materials.",
    kind: "newsletter",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "Help your coursemates: share your materials" },
      { name: "intro", label: "Introduction", type: "textarea", required: true, max: 2000 },
      {
        name: "ways",
        label: "Ways to help (one per line)",
        type: "lines",
        max: 8,
        initial: "Upload past questions and lecture notes\nType out past questions so they're searchable\nGift a PDF to UniArchive from your library",
      },
      ...CTA("Start contributing", absoluteUrl("/upload")),
      SUBJECT,
    ],
  },
  {
    id: "monthly_digest",
    label: "Monthly digest",
    emoji: "📊",
    description: "The month on UniArchive: numbers, standout materials and what's next. The numbers fill in from the database.",
    kind: "newsletter",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "Your month on UniArchive" },
      { name: "month", label: "Month", type: "text", required: true, max: 40, placeholder: "October 2026" },
      {
        name: "intro",
        label: "Introduction",
        type: "textarea",
        required: true,
        max: 2000,
        initial: "Here's what students added and read on UniArchive this month. Thank you for building it with us.",
      },
      {
        name: "stats",
        label: "Numbers (one per line)",
        type: "lines",
        max: 8,
        help: 'Start a line with the number ("152 new materials in the UniLibrary") to show it big. "Fill in the numbers" writes them for you.',
      },
      { name: "materials", label: "Standout materials (optional)", type: "materials", max: 6 },
      { name: "outro", label: "What's next (optional)", type: "textarea", max: 1500 },
      ...CTA("Open the UniLibrary", absoluteUrl("/unilibrary")),
      SUBJECT,
    ],
  },
  {
    id: "profile_nudge",
    label: "Profile nudge",
    emoji: "👤",
    description: 'Ask people to finish their profile. Starts with the "incomplete profile" audience.',
    kind: "announcements",
    audience: { incompleteProfileOnly: true },
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "Finish your profile to get more from UniArchive" },
      {
        name: "intro",
        label: "Introduction",
        type: "textarea",
        required: true,
        max: 2000,
        initial:
          "Your UniArchive profile isn't complete yet. It takes two minutes, and it's how we show you past questions and notes for your own school, department and level.",
      },
      {
        name: "steps",
        label: "What to add (one per line)",
        type: "lines",
        max: 8,
        initial:
          "Your faculty, department and level, so the UniLibrary shows your courses first\nA profile photo and a short bio\nYour school email, for the Verified Student badge",
      },
      { name: "outro", label: "Closing note (optional)", type: "textarea", max: 1000 },
      ...CTA("Complete my profile", absoluteUrl("/profile/edit")),
      SUBJECT,
    ],
  },
  {
    id: "survey_invite",
    label: "Survey invite",
    emoji: "📝",
    description: "Ask people to answer an open survey (/admin/surveys).",
    kind: "announcements",
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true, max: 120, initial: "Tell us what you think of UniArchive" },
      {
        name: "intro",
        label: "Why you're asking",
        type: "textarea",
        required: true,
        max: 2000,
        initial: "We're building UniArchive for students like you, and we'd love to know what's working, what isn't and what you'd like next.",
      },
      { name: "duration", label: "How long it takes (optional)", type: "text", max: 40, placeholder: "about 3 minutes", initial: "about 3 minutes" },
      { name: "closes", label: "Open until (optional)", type: "text", max: 80, placeholder: "Friday 31 October" },
      ...CTA("Answer the survey", absoluteUrl("/surveys")),
      SUBJECT,
    ],
  },
];

export function getTemplate(id: unknown): TemplateDef | undefined {
  return BROADCAST_TEMPLATES.find((t) => t.id === id);
}

/** A new draft's field values. */
export function initialFields(template: TemplateDef): TemplateFields {
  const fields: TemplateFields = {};
  for (const f of template.fields) {
    if (f.type === "checkbox") fields[f.name] = f.initial === true;
    else if (f.type === "lines") fields[f.name] = typeof f.initial === "string" ? f.initial.split("\n") : [];
    else if (f.type === "materials") fields[f.name] = [];
    else fields[f.name] = typeof f.initial === "string" ? f.initial : "";
  }
  return fields;
}

// --- Validation (shared by the editor and the API) ---------------------------

const OBJECT_ID = /^[a-f0-9]{24}$/;

/** https only; plain http just for localhost (local development links). */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return !!url.hostname;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/**
 * Cleans raw input into the template's field values, dropping unknown keys
 * and wrong types. `problems` lists what stops it being sent (missing
 * required fields, bad links); a draft may still be saved with problems.
 */
export function cleanFields(
  template: TemplateDef,
  raw: unknown,
): { fields: TemplateFields; problems: string[] } {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fields: TemplateFields = {};
  const problems: string[] = [];

  for (const f of template.fields) {
    const value = input[f.name];
    switch (f.type) {
      case "checkbox":
        fields[f.name] = value === true;
        break;
      case "lines": {
        const list = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
        const lines = list
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.replace(/\s+/g, " ").trim().slice(0, 300))
          .filter(Boolean);
        if (lines.length > f.max) problems.push(`${f.label}: at most ${f.max} items.`);
        fields[f.name] = lines.slice(0, f.max);
        if (f.required && lines.length === 0) problems.push(`${f.label} is required.`);
        break;
      }
      case "materials": {
        const list = Array.isArray(value) ? value : [];
        const refs: MaterialRef[] = [];
        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const m = item as Record<string, unknown>;
          if (typeof m.id !== "string" || !OBJECT_ID.test(m.id) || typeof m.title !== "string") continue;
          if (refs.some((r) => r.id === m.id)) continue;
          refs.push({
            id: m.id,
            title: m.title.slice(0, 300),
            ...(typeof m.courseCode === "string" && m.courseCode && { courseCode: m.courseCode.slice(0, 40) }),
            ...(typeof m.school === "string" && m.school && { school: m.school.slice(0, 200) }),
          });
        }
        if (refs.length > f.max) problems.push(`${f.label}: at most ${f.max}.`);
        fields[f.name] = refs.slice(0, f.max);
        if (f.required && refs.length === 0) problems.push(`Pick at least one material.`);
        break;
      }
      default: {
        let text = typeof value === "string" ? value : "";
        text = f.type === "textarea" ? text.replace(/\r\n?/g, "\n").trim() : text.replace(/\s+/g, " ").trim();
        if (text.length > f.max) problems.push(`${f.label}: at most ${f.max} characters.`);
        text = text.slice(0, f.max);
        if (f.type === "select" && text && !f.options?.some((o) => o.value === text)) {
          problems.push(`${f.label}: pick one of the options.`);
          text = "";
        }
        if (f.type === "url" && text && !isHttpsUrl(text)) problems.push(`${f.label} must be an https:// link.`);
        fields[f.name] = text;
        if (f.required && !text) problems.push(`${f.label} is required.`);
      }
    }
  }
  // A button needs both its text and its link
  const label = fields.ctaLabel;
  const url = fields.ctaUrl;
  if (typeof label === "string" && typeof url === "string" && !!label !== !!url) {
    problems.push("A button needs both its text and its link.");
  }
  return { fields, problems };
}

// --- Rendering --------------------------------------------------------------

const BRAND = "#667eea";
const str = (f: TemplateFields, name: string) => (typeof f[name] === "string" ? (f[name] as string) : "");
const list = (f: TemplateFields, name: string) => (Array.isArray(f[name]) ? (f[name] as string[]) : []);

function heading(text: string): string {
  return `<h2 style="margin: 0 0 16px; font-size: 20px; color: #222;">${escapeHtml(text)}</h2>`;
}

function banner(emoji: string, label: string, title: string, bg: string, color: string): string {
  return `
          <div style="background: ${bg}; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 28px;">${emoji}</div>
            <div style="font-size: 12px; font-weight: bold; color: ${color}; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(label)}</div>
            <div style="font-size: 18px; font-weight: bold; color: ${color}; margin-top: 4px;">${escapeHtml(title)}</div>
          </div>`;
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul style="padding-left: 20px;">${items.map((i) => `<li style="margin: 4px 0;">${linkify(i)}</li>`).join("")}</ul>`;
}

function detailRows(rows: [string, string][]): string {
  const present = rows.filter(([, v]) => v);
  if (present.length === 0) return "";
  return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${present
    .map(
      ([k, v]) =>
        `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">${escapeHtml(k)}</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

/**
 * Stat lines as big numbers: "152 new materials" shows 152 large with its
 * label below; a line that doesn't start with a number is a plain cell.
 */
function statGrid(lines: string[]): string {
  if (lines.length === 0) return "";
  const cells = lines.map((line) => {
    const m = /^([\d.,]+[+%kKmM]?)\s+(.+)$/.exec(line.trim());
    return m
      ? `<td style="padding: 10px; text-align: center; vertical-align: top; width: 50%;"><div style="font-size: 26px; font-weight: bold; color: ${BRAND};">${escapeHtml(m[1])}</div><div style="font-size: 13px; color: #555; margin-top: 2px;">${escapeHtml(m[2])}</div></td>`
      : `<td style="padding: 10px; text-align: center; vertical-align: top; width: 50%; font-size: 14px; color: #333;">${escapeHtml(line)}</td>`;
  });
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] ?? "<td></td>"}</tr>`);
  return `<table role="presentation" style="width: 100%; border-collapse: separate; border-spacing: 0 8px; margin: 16px 0; background: #f8f9ff; border-radius: 10px;">${rows.join("")}</table>`;
}

function button(f: TemplateFields): string {
  const label = str(f, "ctaLabel");
  const url = str(f, "ctaUrl");
  if (!label || !url || !isHttpsUrl(url)) return "";
  return `
          <div style="text-align: center; margin: 28px 0 8px;">
            <a href="${escapeHtml(url)}" style="background: ${BRAND}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${escapeHtml(label)}</a>
          </div>`;
}

function materialCards(refs: MaterialRef[]): string {
  return refs
    .map((m) => {
      const meta = [m.courseCode, m.school].filter(Boolean).join(" · ");
      return `
          <a href="${escapeHtml(absoluteUrl(`/materials/${m.id}`))}" style="display: block; text-decoration: none; background: white; border: 1px solid #e5e5e5; border-left: 4px solid ${BRAND}; border-radius: 8px; padding: 12px 16px; margin: 10px 0;">
            <span style="display: block; font-weight: bold; color: #222;">${escapeHtml(m.title)}</span>
            ${meta ? `<span style="display: block; font-size: 13px; color: #666; margin-top: 2px;">${escapeHtml(meta)}</span>` : ""}
          </a>`;
    })
    .join("");
}

// Plain-text helpers for the text/plain part
const textButton = (f: TemplateFields) => {
  const label = str(f, "ctaLabel");
  const url = str(f, "ctaUrl");
  return label && url ? `${label}: ${url}` : "";
};
const textList = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

interface Body {
  subject: string;
  heading: string;
  html: string;
  text: string[];
}

const PLATFORM_STYLE = {
  feature: { emoji: "✨", label: "New feature", bg: "#f0fdf4", color: "#166534" },
  maintenance: { emoji: "🔧", label: "Planned maintenance", bg: "#fffbeb", color: "#92400e" },
  important: { emoji: "📣", label: "Important change", bg: "#eef2ff", color: "#3730a3" },
} as const;
const URGENCY_STYLE = {
  critical: { emoji: "🚨", label: "Critical", bg: "#fff1f2", color: "#991b1b" },
  high: { emoji: "⚠️", label: "Urgent", bg: "#fffbeb", color: "#92400e" },
  medium: { emoji: "ℹ️", label: "Notice", bg: "#eff6ff", color: "#1e40af" },
} as const;

function renderBody(template: TemplateDef, f: TemplateFields): Body {
  switch (template.id) {
    case "general_announcement": {
      const headline = str(f, "headline");
      return {
        subject: headline,
        heading: "Announcement",
        html: `${heading(headline)}${plainTextToHtml(str(f, "body"))}${bulletList(list(f, "bullets"))}${button(f)}`,
        text: [headline, "", str(f, "body"), textList(list(f, "bullets")), textButton(f)],
      };
    }
    case "platform_update": {
      const kind = (str(f, "updateType") || "feature") as keyof typeof PLATFORM_STYLE;
      const style = PLATFORM_STYLE[kind] ?? PLATFORM_STYLE.feature;
      const title = str(f, "title");
      const affected = list(f, "affected");
      const action = f.actionRequired === true;
      return {
        subject: `${style.label}: ${title}`,
        heading: "Platform update",
        html: `${banner(style.emoji, style.label, title, style.bg, style.color)}${plainTextToHtml(str(f, "description"))}${detailRows([
          ["Starts", str(f, "startsAt")],
          ["Ends", str(f, "endsAt")],
        ])}${
          affected.length ? `<p style="margin-bottom: 4px;"><strong>Affected:</strong></p>${bulletList(affected)}` : ""
        }${
          action
            ? `<p style="background: #fff1f2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-weight: bold;">Action needed: please read the details above.</p>`
            : ""
        }${button(f)}`,
        text: [
          `${style.label}: ${title}`,
          "",
          str(f, "description"),
          str(f, "startsAt") && `Starts: ${str(f, "startsAt")}`,
          str(f, "endsAt") && `Ends: ${str(f, "endsAt")}`,
          affected.length ? `Affected:\n${textList(affected)}` : "",
          action ? "Action needed: please read the details above." : "",
          textButton(f),
        ],
      };
    }
    case "urgent_notice": {
      const level = (str(f, "urgency") || "high") as keyof typeof URGENCY_STYLE;
      const style = URGENCY_STYLE[level] ?? URGENCY_STYLE.high;
      const headline = str(f, "headline");
      return {
        subject: `${style.emoji} ${headline}`,
        heading: "Urgent notice",
        html: `${banner(style.emoji, style.label, headline, style.bg, style.color)}${plainTextToHtml(str(f, "body"))}${button(f)}`,
        text: [`${style.label.toUpperCase()}: ${headline}`, "", str(f, "body"), textButton(f)],
      };
    }
    case "custom_message":
      return {
        subject: str(f, "subject"),
        heading: "A message from UniArchive",
        html: plainTextToHtml(str(f, "body")),
        text: [str(f, "body")],
      };
    case "new_materials": {
      const headline = str(f, "headline");
      const refs = Array.isArray(f.materials) ? (f.materials as MaterialRef[]) : [];
      return {
        subject: headline,
        heading: "New in the UniLibrary",
        html: `${heading(headline)}${plainTextToHtml(str(f, "intro"))}${materialCards(refs)}${
          str(f, "outro") ? plainTextToHtml(str(f, "outro")) : ""
        }${button(f)}`,
        text: [
          headline,
          "",
          str(f, "intro"),
          refs
            .map((m) => `- ${m.title}${m.courseCode ? ` (${m.courseCode})` : ""}: ${absoluteUrl(`/materials/${m.id}`)}`)
            .join("\n"),
          str(f, "outro"),
          textButton(f),
        ],
      };
    }
    case "exam_season": {
      const headline = str(f, "headline");
      const tips = list(f, "tips");
      return {
        subject: headline,
        heading: "Exam season",
        html: `${heading(headline)}${plainTextToHtml(str(f, "intro"))}${detailRows([["Exam period", str(f, "examPeriod")]])}${
          tips.length ? `<p style="margin-bottom: 4px;"><strong>Tips</strong></p>${bulletList(tips)}` : ""
        }${button(f)}`,
        text: [
          headline,
          "",
          str(f, "intro"),
          str(f, "examPeriod") && `Exam period: ${str(f, "examPeriod")}`,
          tips.length ? `Tips:\n${textList(tips)}` : "",
          textButton(f),
        ],
      };
    }
    case "monthly_digest": {
      const headline = str(f, "headline");
      const month = str(f, "month");
      const stats = list(f, "stats");
      const refs = Array.isArray(f.materials) ? (f.materials as MaterialRef[]) : [];
      return {
        subject: month ? `${headline}: ${month}` : headline,
        heading: month ? `Monthly digest · ${month}` : "Monthly digest",
        html: `${banner("📊", "Monthly digest", month || headline, "#eef2ff", "#3730a3")}${heading(headline)}${plainTextToHtml(str(f, "intro"))}${statGrid(stats)}${
          refs.length ? `<p style="margin: 20px 0 4px;"><strong>Standout materials</strong></p>${materialCards(refs)}` : ""
        }${str(f, "outro") ? plainTextToHtml(str(f, "outro")) : ""}${button(f)}`,
        text: [
          month ? `${headline} (${month})` : headline,
          "",
          str(f, "intro"),
          stats.length ? textList(stats) : "",
          refs.length
            ? `Standout materials:\n${refs.map((m) => `- ${m.title}${m.courseCode ? ` (${m.courseCode})` : ""}: ${absoluteUrl(`/materials/${m.id}`)}`).join("\n")}`
            : "",
          str(f, "outro"),
          textButton(f),
        ],
      };
    }
    case "profile_nudge": {
      const headline = str(f, "headline");
      const steps = list(f, "steps");
      return {
        subject: headline,
        heading: "Your profile",
        html: `${heading(headline)}${plainTextToHtml(str(f, "intro"))}${
          steps.length ? `<p style="margin-bottom: 4px;"><strong>What to add</strong></p>${bulletList(steps)}` : ""
        }${str(f, "outro") ? plainTextToHtml(str(f, "outro")) : ""}${button(f)}`,
        text: [headline, "", str(f, "intro"), steps.length ? `What to add:\n${textList(steps)}` : "", str(f, "outro"), textButton(f)],
      };
    }
    case "survey_invite": {
      const headline = str(f, "headline");
      const facts: [string, string][] = [
        ["Takes", str(f, "duration")],
        ["Open until", str(f, "closes")],
      ];
      return {
        subject: headline,
        heading: "Survey",
        html: `${heading(headline)}${plainTextToHtml(str(f, "intro"))}${detailRows(facts)}${button(f)}`,
        text: [
          headline,
          "",
          str(f, "intro"),
          facts.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"),
          textButton(f),
        ],
      };
    }
    case "contributor_call": {
      const headline = str(f, "headline");
      const ways = list(f, "ways");
      return {
        subject: headline,
        heading: "Call for contributors",
        html: `${heading(headline)}${plainTextToHtml(str(f, "intro"))}${
          ways.length ? `<p style="margin-bottom: 4px;"><strong>Ways to help</strong></p>${bulletList(ways)}` : ""
        }${button(f)}`,
        text: [headline, "", str(f, "intro"), ways.length ? `Ways to help:\n${textList(ways)}` : "", textButton(f)],
      };
    }
  }
}

// A Brevo merge tag (their documented default-filter syntax), put into the
// HTML as is: escaping would break the filter's quotes. A constant, never
// user input.
export const GREETING = 'Hi {{ contact.FIRSTNAME|default:"there" }},';

/** The email as Brevo will send it, merge tags included. */
export function renderBroadcast(template: TemplateDef, fields: TemplateFields, kind: EmailKind): RenderedBroadcast {
  const body = renderBody(template, fields);
  const subject = (str(fields, "subject") || body.subject || template.label).slice(0, 150);
  const footerHtml =
    `You're receiving this because you have a UniArchive account and get our ${kind === "newsletter" ? "newsletter" : "announcements"}. ` +
    `<a href="{{ contact.PREFS_URL }}" style="color: ${BRAND};">Manage email preferences</a> · ` +
    `<a href="{{ unsubscribe }}" style="color: ${BRAND};">Unsubscribe</a>`;
  const html = emailFrame(
    subject,
    body.heading,
    `
          <p style="margin-top: 0;">${GREETING}</p>${body.html}
          <p>The UniArchive team</p>`,
    { html: footerHtml },
  );
  const text = [
    GREETING,
    "",
    ...body.text.filter((line) => line !== ""),
    "",
    "The UniArchive team",
    "",
    "--",
    "Manage email preferences: {{ contact.PREFS_URL }}",
    "Unsubscribe: {{ unsubscribe }}",
  ].join("\n");
  return { subject, html, text };
}

/** Fills the merge tags, for the preview and the test copy. */
export function personalize(
  rendered: RenderedBroadcast,
  values: { firstName: string; prefsUrl: string; unsubscribeUrl: string },
): RenderedBroadcast {
  const fill = (s: string, escape: boolean) => {
    const e = escape ? escapeHtml : (v: string) => v;
    return s
      .replaceAll('{{ contact.FIRSTNAME|default:"there" }}', e(values.firstName || "there"))
      .replaceAll("{{ contact.PREFS_URL }}", e(values.prefsUrl))
      .replaceAll("{{ unsubscribe }}", e(values.unsubscribeUrl));
  };
  return { subject: rendered.subject, html: fill(rendered.html, true), text: fill(rendered.text, false) };
}

/** The kind of bulk email a draft is, given its template (and choice). */
export function broadcastKind(template: TemplateDef, chosen?: unknown): EmailKind {
  if (template.kind !== "choose") return template.kind;
  return chosen === "newsletter" ? "newsletter" : "announcements";
}
