// src/lib/outline.ts
// A material's outline: the table of contents of a textbook, or the course
// outline of lecture notes. A flat list of entries with a level (1-3), so it
// is easy to edit, store and render; nesting is implied by the levels.
//
// Pure and dependency-free: the API validates with parseOutline, and the
// editor uses the same rules and limits.
import type { MaterialSubcategory } from "@/lib/constants/materialCategories";

export type OutlineKind = "toc" | "course_outline";

export interface OutlineEntry {
  title: string;
  level: 1 | 2 | 3;
  /** PDF page (1-based) the entry starts on. Optional for course outlines. */
  page?: number;
  /** The page number printed in the book, when it differs ("xi", "12"). */
  pageLabel?: string;
}

export interface MaterialOutline {
  kind: OutlineKind;
  entries: OutlineEntry[];
}

export const OUTLINE_LIMITS = {
  entries: 300,
  title: 200,
  pageLabel: 20,
  maxLevel: 3,
} as const;

const TOC_TYPES: MaterialSubcategory[] = ["TEXTBOOK", "EBOOK", "COURSE_MATERIAL"];
const COURSE_OUTLINE_TYPES: MaterialSubcategory[] = ["LECTURE_NOTE", "SYLLABUS", "TUTORIAL"];

/** Which outline a material of this type gets; null for types without one. */
export function outlineKindFor(subcategory: string | undefined | null): OutlineKind | null {
  if (!subcategory) return null;
  if ((TOC_TYPES as string[]).includes(subcategory)) return "toc";
  if ((COURSE_OUTLINE_TYPES as string[]).includes(subcategory)) return "course_outline";
  return null;
}

export const OUTLINE_LABELS: Record<OutlineKind, { title: string; levels: [string, string, string] }> = {
  toc: { title: "Table of contents", levels: ["Chapter", "Section", "Subsection"] },
  course_outline: { title: "Course outline", levels: ["Week / module", "Topic", "Subtopic"] },
};

export type ParsedOutline = { ok: true; value: MaterialOutline | null } | { ok: false; message: string };

/**
 * Validates an outline from a request body. `null`, or an empty entry list,
 * means "no outline". The kind always comes from the material's type, never
 * from the client. `pageCount` (when known) bounds the page numbers.
 */
export function parseOutline(
  raw: unknown,
  subcategory: string | undefined | null,
  pageCount?: number,
): ParsedOutline {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const kind = outlineKindFor(subcategory);
  const entriesRaw = (raw as { entries?: unknown }).entries;
  if (typeof raw !== "object" || !Array.isArray(entriesRaw)) {
    return { ok: false, message: "outline must be { entries: [...] }." };
  }
  if (entriesRaw.length === 0) return { ok: true, value: null };
  if (!kind) {
    return { ok: false, message: "Only textbooks, course materials and lecture notes can have an outline." };
  }
  if (entriesRaw.length > OUTLINE_LIMITS.entries) {
    return { ok: false, message: `An outline can have at most ${OUTLINE_LIMITS.entries} entries.` };
  }

  const entries: OutlineEntry[] = [];
  let previousLevel = 0;
  for (const [i, item] of entriesRaw.entries()) {
    const n = i + 1;
    const e = item as Partial<Record<keyof OutlineEntry, unknown>>;
    if (!e || typeof e !== "object") return { ok: false, message: `Entry ${n} is not valid.` };

    const title = typeof e.title === "string" ? e.title.trim().replace(/\s+/g, " ") : "";
    if (!title) return { ok: false, message: `Entry ${n} needs a title.` };
    if (title.length > OUTLINE_LIMITS.title) {
      return { ok: false, message: `Entry ${n}'s title is longer than ${OUTLINE_LIMITS.title} characters.` };
    }

    const level = e.level;
    if (level !== 1 && level !== 2 && level !== 3) {
      return { ok: false, message: `Entry ${n}'s level must be 1, 2 or 3.` };
    }
    // Nesting can go one level deeper at a time, and the first entry is top level
    if (level > previousLevel + 1) {
      return { ok: false, message: `Entry ${n} is indented more than one level below the entry above it.` };
    }
    previousLevel = level;

    const entry: OutlineEntry = { title, level };
    if (e.page !== undefined && e.page !== null && e.page !== "") {
      const page = Number(e.page);
      if (!Number.isInteger(page) || page < 1 || (pageCount && page > pageCount)) {
        return {
          ok: false,
          message: `Entry ${n}'s page must be a whole number from 1${pageCount ? ` to ${pageCount}` : ""}.`,
        };
      }
      entry.page = page;
    } else if (kind === "toc") {
      return { ok: false, message: `Entry ${n} needs a page: table of contents entries point at a page.` };
    }

    if (e.pageLabel !== undefined && e.pageLabel !== null && e.pageLabel !== "") {
      const label = typeof e.pageLabel === "string" ? e.pageLabel.trim() : "";
      if (!label || label.length > OUTLINE_LIMITS.pageLabel) {
        return { ok: false, message: `Entry ${n}'s printed page label must be 1-${OUTLINE_LIMITS.pageLabel} characters.` };
      }
      entry.pageLabel = label;
    }
    entries.push(entry);
  }
  return { ok: true, value: { kind, entries } };
}

/**
 * Fixes nesting the rules don't allow: the first entry becomes top level and
 * no entry sits more than one level below the one above it. Used after
 * importing bookmarks and after moving entries around in the editor.
 */
export function normalizeLevels(entries: OutlineEntry[]): OutlineEntry[] {
  let previous = 0;
  return entries.map((entry) => {
    const level = Math.min(entry.level, previous + 1) as OutlineEntry["level"];
    previous = level;
    return level === entry.level ? entry : { ...entry, level };
  });
}
