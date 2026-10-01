// src/lib/conversions.ts
// The conversion workspace (/contribute/[materialId]): contributors type out
// past questions, lecture notes or textbook content from a PDF. This module
// is dependency-free so the browser (local autosave) and the API share it.
//
// A draft is the editor's in-progress state. It's saved loosely: a
// half-typed question is fine. The existing typed-content validators
// (lib/layer2.ts) only run when something is submitted.

export const CONVERSION_KINDS = ["questions", "note"] as const;
export type ConversionKind = (typeof CONVERSION_KINDS)[number];

export const DRAFT_LIMITS = {
  /** Serialized payload size. */
  payloadBytes: 512 * 1024,
  questions: 500,
  activeDraftsPerUser: 20,
  /** A draft untouched this long is shown as stale on the dashboard. */
  staleDays: 90,
  /** And deleted this long after it was last touched. */
  deleteAfterDays: 180,
} as const;

export interface DraftQuestion {
  /** Stable id for this item, made in the browser (merging, idempotent submits). */
  clientItemId: string;
  questionNumber?: number;
  questionPart?: string;
  questionType: string;
  questionText: string;
  marks?: number | string;
  options?: { label: string; text: string }[];
  /** PDF page the question was typed from. */
  sourcePage?: number;
  /** Set once submitted: the published TypedQuestion. */
  submittedId?: string;
  submittedAt?: string;
}

export interface DraftNote {
  documentType: string;
  title: string;
  chapterNumber?: number | string;
  chapterTitle?: string;
  contentBlocks: { id: string; type: string; content: string; description?: string; imageDescription?: string }[];
  sourcePage?: number;
}

export type DraftPayload = { questions: DraftQuestion[] } | { note: DraftNote };

/** The draft as the API returns it. */
export interface ConversionDraftDto {
  id: string;
  materialId: string;
  kind: ConversionKind;
  /** The published note being edited, when there is one. */
  targetDocId?: string;
  payload: DraftPayload;
  revision: number;
  lastPage?: number;
  status: "active" | "submitted" | "abandoned";
  updatedAt: string;
  /** The note's updatedAt when the draft started (edit conflicts). */
  baseDocUpdatedAt?: string;
}

/** Words in text that may contain HTML (rich text) or KaTeX markup. */
export function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\$\$?[^$]*\$\$?/g, " formula ");
  const words = plain.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

export type ShapeCheck = { ok: true } | { ok: false; message: string };

/**
 * Loose structural check for a draft being saved: the right shape and within
 * the limits, nothing more. Content rules wait for submission.
 */
export function checkDraftPayload(kind: ConversionKind, payload: unknown): ShapeCheck {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "payload must be an object." };
  }
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return { ok: false, message: "payload isn't valid JSON." };
  }
  if (size > DRAFT_LIMITS.payloadBytes) {
    return { ok: false, message: "This draft is too large to save. Split it into another note or submit some questions." };
  }

  if (kind === "questions") {
    const questions = (payload as { questions?: unknown }).questions;
    if (!Array.isArray(questions)) return { ok: false, message: "payload.questions must be a list." };
    if (questions.length > DRAFT_LIMITS.questions) {
      return { ok: false, message: `A draft can hold at most ${DRAFT_LIMITS.questions} questions.` };
    }
    const ids = new Set<string>();
    for (const q of questions as Record<string, unknown>[]) {
      if (!q || typeof q !== "object") return { ok: false, message: "Each question must be an object." };
      if (typeof q.clientItemId !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(q.clientItemId) || ids.has(q.clientItemId)) {
        return { ok: false, message: "Each question needs a unique clientItemId." };
      }
      ids.add(q.clientItemId);
      if (typeof q.questionText !== "string" || typeof q.questionType !== "string") {
        return { ok: false, message: "Each question needs questionText and questionType strings." };
      }
    }
    return { ok: true };
  }

  const note = (payload as { note?: unknown }).note as Record<string, unknown> | undefined;
  if (!note || typeof note !== "object") return { ok: false, message: "payload.note must be an object." };
  if (typeof note.title !== "string" || typeof note.documentType !== "string") {
    return { ok: false, message: "payload.note needs title and documentType strings." };
  }
  if (!Array.isArray(note.contentBlocks)) return { ok: false, message: "payload.note.contentBlocks must be a list." };
  return { ok: true };
}

/** An empty payload for a new draft. */
export function emptyPayload(kind: ConversionKind): DraftPayload {
  return kind === "questions"
    ? { questions: [] }
    : { note: { documentType: "lecture_note", title: "", contentBlocks: [] } };
}

/** Header carrying the idempotency key on question / note submissions. */
export const IDEMPOTENCY_HEADER = "idempotency-key";
export const isIdempotencyKey = (v: string | null): v is string => !!v && /^[A-Za-z0-9:_-]{8,140}$/.test(v);
