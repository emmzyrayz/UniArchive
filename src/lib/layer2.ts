// src/lib/layer2.ts
// Server helpers for Layer 2 typed content: who may do what, loading the
// parent material, keeping Material.hasTypedContent true to the data,
// validating bodies, and shaping responses.
import { Types, isValidObjectId } from "mongoose";
import { can } from "@/lib/auth/permissions";
import { getMaterialModel, type IMaterial } from "@/lib/models/materialModel";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import type { ITypedAnswer } from "@/lib/models/typedAnswerModel";
import {
  getContentDocumentModel,
  type IContentDocument,
} from "@/lib/models/contentDocumentModel";
import {
  CONTENT_DOCUMENT_TYPES,
  LIMITS,
  QUESTION_TYPES,
  type ContentDocumentType,
  type QuestionType,
} from "@/lib/constants/layer2";
import { CONTENT_BLOCK_TYPES, type ContentBlock } from "@/types/content";
import { roleHierarchy, type UserRole } from "@/types/roles";
import { countWords } from "@/lib/conversions";
import type { AnswerDto, ContentDocumentDto, QuestionDto } from "@/types/layer2";

// --- Who may do what ----------------------------------------------------------

/** Coarse "this role or above" (see roleHierarchy). */
export const atLeast = (role: UserRole, min: UserRole) => roleHierarchy[role] >= roleHierarchy[min];

/** Lecturer+ accept answers and mark MCQ options correct (tier 2 reviewers). */
export const canAcceptAnswers = (role: UserRole) => can(role, "submission.verify_tier2");

/** Typed notes are written by Collaborators and above (typed questions: anyone signed in). */
export const canWriteNotes = (role: UserRole) => atLeast(role, "collaborator");

/** A note can be edited by whoever wrote it, and by auditors and above. */
export const canEditNote = (session: { userId: string; role: UserRole }, doc: { createdBy: unknown }) =>
  String(doc.createdBy) === session.userId || atLeast(session.role, "auditor");

// --- Word counts (dashboard Conversions tab) -------------------------------------

export const questionWordCount = (q: { questionText: string; options?: { text: string }[] }) =>
  countWords(q.questionText) + (q.options ?? []).reduce((n, o) => n + countWords(o.text), 0);

export const noteWordCount = (doc: { title?: string; contentBlocks?: ContentBlock[] }) =>
  countWords(doc.title) +
  (doc.contentBlocks ?? []).reduce(
    (n, b) => n + countWords(b.content) + countWords(b.description) + countWords(b.imageDescription),
    0,
  );

export const answerUpvotesKey = (userId: string) => `answer_upvotes:${userId}`;

// --- Parent material ------------------------------------------------------------

export type Layer2Material = Pick<IMaterial, "_id" | "category" | "bookId" | "submittedBy" | "title" | "isActive">;

/** The material if it exists and is active (Layer 2 follows Layer 1's visibility). */
export async function loadActiveMaterial(id: string): Promise<Layer2Material | null> {
  if (!isValidObjectId(id)) return null;
  const Material = await getMaterialModel();
  return Material.findOne({ _id: id, isActive: true })
    .select("category bookId submittedBy title isActive")
    .lean<Layer2Material>();
}

/**
 * Sets Material.hasTypedContent from what exists (any typed question or
 * active typed note), so it can't drift through creates and deletes.
 */
export async function refreshTypedContentFlag(materialId: Types.ObjectId | string): Promise<void> {
  const id = new Types.ObjectId(String(materialId));
  const [Question, Doc, Material] = await Promise.all([
    getTypedQuestionModel(),
    getContentDocumentModel(),
    getMaterialModel(),
  ]);
  const [question, doc] = await Promise.all([
    Question.exists({ materialId: id }),
    Doc.exists({ materialId: id, isActive: true }),
  ]);
  await Material.updateOne(
    { _id: id },
    { $set: { hasTypedContent: !!(question || doc) } },
    { timestamps: false },
  );
}

/** Title and uploader of each (active) source textbook, keyed by id. */
export async function loadSourceTextbooks(
  ids: (Types.ObjectId | undefined)[],
): Promise<Map<string, NonNullable<ContentDocumentDto["sourceTextbook"]>>> {
  const wanted = ids.filter((id): id is Types.ObjectId => !!id);
  const map = new Map<string, NonNullable<ContentDocumentDto["sourceTextbook"]>>();
  if (!wanted.length) return map;
  const Material = await getMaterialModel();
  const books = await Material.find({ _id: { $in: wanted }, isActive: true })
    .select("title submittedByUpid source")
    .lean<{ _id: Types.ObjectId; title: string; submittedByUpid: string; source?: string }[]>();
  for (const b of books) {
    const isPlatform = b.source === "platform";
    map.set(String(b._id), {
      id: String(b._id),
      title: b.title,
      // Platform materials are credited to UniArchive, not their uploader
      submittedByUpid: isPlatform ? "" : b.submittedByUpid,
      ...(isPlatform ? { isPlatform: true } : {}),
    });
  }
  return map;
}

// --- Validation -------------------------------------------------------------------

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };
const bad = (message: string): Parsed<never> => ({ ok: false, message });

const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;

const optionalText = (v: unknown, max: number): string | undefined | null => {
  if (v === undefined || v === null || v === "") return undefined;
  return typeof v === "string" && v.trim().length <= max ? v.trim() || undefined : null;
};

export interface QuestionInput {
  questionNumber: number;
  questionPart?: string;
  questionText: string;
  questionType: QuestionType;
  marks?: number;
  options?: { label: string; text: string; isCorrect?: boolean }[];
}

/**
 * A question body. `mayMarkCorrect`: only lecturer+ may set isCorrect on
 * options; for anyone else the flag is dropped.
 */
export function parseQuestionBody(body: Record<string, unknown> | null, mayMarkCorrect: boolean): Parsed<QuestionInput> {
  if (!body) return bad("Invalid request body.");
  const n = body.questionNumber;
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > LIMITS.maxQuestionNumber) {
    return bad(`Question number must be 1-${LIMITS.maxQuestionNumber}.`);
  }
  const part = optionalText(body.questionPart, LIMITS.questionPart);
  if (part === null || (part && !/^[a-z0-9]+$/i.test(part))) return bad("Question part must be short, like a, b or ii.");
  const questionText = text(body.questionText, LIMITS.questionText);
  if (!questionText) return bad(`Question text must be 1-${LIMITS.questionText} characters.`);
  const questionType = body.questionType;
  if (!(QUESTION_TYPES as readonly string[]).includes(questionType as string)) return bad("Unknown question type.");
  let marks: number | undefined;
  if (body.marks !== undefined && body.marks !== null && body.marks !== "") {
    const m = Number(body.marks);
    if (!Number.isFinite(m) || m < 0 || m > LIMITS.maxMarks) return bad(`Marks must be 0-${LIMITS.maxMarks}.`);
    marks = m;
  }

  let options: QuestionInput["options"];
  if (questionType === "objective") {
    const raw = body.options;
    if (!Array.isArray(raw) || raw.length < LIMITS.minOptions || raw.length > LIMITS.maxOptions) {
      return bad(`An objective question needs ${LIMITS.minOptions}-${LIMITS.maxOptions} options.`);
    }
    options = [];
    const labels = new Set<string>();
    for (const o of raw) {
      const label = text((o as { label?: unknown })?.label, 3)?.toUpperCase();
      const optionText = text((o as { text?: unknown })?.text, LIMITS.optionText);
      if (!label || !optionText) return bad(`Each option needs a label and 1-${LIMITS.optionText} characters of text.`);
      if (labels.has(label)) return bad(`Option ${label} appears twice.`);
      labels.add(label);
      options.push({
        label,
        text: optionText,
        ...(mayMarkCorrect && (o as { isCorrect?: unknown }).isCorrect === true ? { isCorrect: true } : {}),
      });
    }
  }

  return {
    ok: true,
    value: {
      questionNumber: n as number,
      ...(part ? { questionPart: part.toLowerCase() } : {}),
      questionText,
      questionType: questionType as QuestionType,
      ...(marks !== undefined ? { marks } : {}),
      ...(options ? { options } : {}),
    },
  };
}

export interface AnswerInput {
  answerText: string;
  workings?: string;
  explanation?: string;
  selectedOption?: string;
}

export function parseAnswerBody(
  body: Record<string, unknown> | null,
  question: Pick<ITypedQuestion, "questionType" | "options">,
): Parsed<AnswerInput> {
  if (!body) return bad("Invalid request body.");
  const answerText = text(body.answerText, LIMITS.answerText);
  if (!answerText) return bad(`An answer must be 1-${LIMITS.answerText} characters.`);
  const workings = optionalText(body.workings, LIMITS.workings);
  if (workings === null) return bad(`Workings can be up to ${LIMITS.workings} characters.`);
  const explanation = optionalText(body.explanation, LIMITS.explanation);
  if (explanation === null) return bad(`The explanation can be up to ${LIMITS.explanation} characters.`);

  let selectedOption: string | undefined;
  if (question.questionType === "objective") {
    const choice = typeof body.selectedOption === "string" ? body.selectedOption.trim().toUpperCase() : "";
    if (!question.options?.some((o) => o.label === choice)) return bad("Choose one of the options.");
    selectedOption = choice;
  }
  return {
    ok: true,
    value: { answerText, ...(workings ? { workings } : {}), ...(explanation ? { explanation } : {}), ...(selectedOption ? { selectedOption } : {}) },
  };
}

export interface ContentInput {
  documentType: ContentDocumentType;
  title: string;
  chapterNumber?: number;
  chapterTitle?: string;
  sourceTextbookId?: Types.ObjectId | null;
  contentBlocks: ContentBlock[];
}

function parseBlocks(raw: unknown): Parsed<ContentBlock[]> {
  if (!Array.isArray(raw)) return bad("contentBlocks must be a list.");
  if (raw.length > LIMITS.maxBlocks) return bad(`At most ${LIMITS.maxBlocks} blocks.`);
  const blocks: ContentBlock[] = [];
  const ids = new Set<string>();
  for (const b of raw as Record<string, unknown>[]) {
    const id = typeof b?.id === "string" && b.id.length > 0 && b.id.length <= 64 ? b.id : null;
    if (!id || ids.has(id)) return bad("Each block needs a unique id.");
    ids.add(id);
    if (!CONTENT_BLOCK_TYPES.includes(b.type as ContentBlock["type"])) return bad("Unknown block type.");
    if (typeof b.content !== "string" || b.content.length > LIMITS.blockContent) {
      return bad(`A block can hold up to ${LIMITS.blockContent} characters.`);
    }
    const description = optionalText(b.description, LIMITS.blockDescription);
    const imageDescription = optionalText(b.imageDescription, LIMITS.blockDescription);
    if (description === null || imageDescription === null) return bad("A block description is too long.");
    blocks.push({
      id,
      type: b.type as ContentBlock["type"],
      // Rich text is HTML, sanitised with DOMPurify when rendered (BlockRenderer)
      content: b.content,
      ...(description ? { description } : {}),
      ...(imageDescription ? { imageDescription } : {}),
    });
  }
  return { ok: true, value: blocks };
}

/**
 * A content document body. With `partial`, only the fields present are
 * validated and returned (PATCH).
 */
export async function parseContentBody(
  body: Record<string, unknown> | null,
  partial: boolean,
): Promise<Parsed<Partial<ContentInput>>> {
  if (!body) return bad("Invalid request body.");
  const out: Partial<ContentInput> = {};
  const has = (k: string) => !partial || body[k] !== undefined;

  if (has("documentType")) {
    if (!(CONTENT_DOCUMENT_TYPES as readonly string[]).includes(body.documentType as string)) return bad("Unknown document type.");
    out.documentType = body.documentType as ContentDocumentType;
  }
  if (has("title")) {
    const title = text(body.title, LIMITS.documentTitle);
    if (!title) return bad(`A title must be 1-${LIMITS.documentTitle} characters.`);
    out.title = title;
  }
  if (body.chapterNumber !== undefined && body.chapterNumber !== null && body.chapterNumber !== "") {
    const c = Number(body.chapterNumber);
    if (!Number.isInteger(c) || c < 0 || c > 1000) return bad("Chapter number must be 0-1000.");
    out.chapterNumber = c;
  }
  if (body.chapterTitle !== undefined) {
    const chapterTitle = optionalText(body.chapterTitle, LIMITS.chapterTitle);
    if (chapterTitle === null) return bad(`Chapter title can be up to ${LIMITS.chapterTitle} characters.`);
    out.chapterTitle = chapterTitle;
  }
  if (body.sourceTextbookId !== undefined) {
    if (body.sourceTextbookId === null || body.sourceTextbookId === "") {
      out.sourceTextbookId = null;
    } else {
      const source = await loadActiveMaterial(String(body.sourceTextbookId));
      if (!source || source.category !== "BOOKS") return bad("The source textbook must be an active textbook in the UniLibrary.");
      out.sourceTextbookId = source._id;
    }
  }
  if (has("contentBlocks")) {
    const blocks = parseBlocks(body.contentBlocks);
    if (!blocks.ok) return blocks;
    if (!partial && blocks.value.length === 0) return bad("Add some content first.");
    out.contentBlocks = blocks.value;
  }
  return { ok: true, value: out };
}

// --- Response shapes ----------------------------------------------------------------

const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

export function toAnswerDto(
  a: ITypedAnswer,
  opts: { upvoted?: Set<string>; acceptedBy?: { upid: string; role: string } } = {},
): AnswerDto {
  const id = String(a._id);
  return {
    id,
    questionId: String(a.questionId),
    submittedByUpid: a.submittedByUpid,
    answerText: a.answerText,
    workings: a.workings,
    explanation: a.explanation,
    selectedOption: a.selectedOption,
    isAccepted: !!a.isAccepted,
    acceptedAt: iso(a.acceptedAt),
    ...(opts.acceptedBy ? { acceptedBy: opts.acceptedBy } : {}),
    upvoteCount: a.upvoteCount ?? 0,
    ...(opts.upvoted ? { upvotedByMe: opts.upvoted.has(id) } : {}),
    createdAt: iso(a.createdAt)!,
  };
}

export function toQuestionDto(
  q: ITypedQuestion,
  opts: { acceptedAnswer?: AnswerDto; answeredByMe: boolean | null },
): QuestionDto {
  return {
    id: String(q._id),
    materialId: String(q.materialId),
    submittedByUpid: q.submittedByUpid,
    questionNumber: q.questionNumber,
    questionPart: q.questionPart || undefined,
    questionText: q.questionText,
    questionType: q.questionType,
    marks: q.marks,
    options: q.options?.map((o) => ({ label: o.label, text: o.text, ...(o.isCorrect ? { isCorrect: true } : {}) })),
    answerCount: q.answerCount ?? 0,
    acceptedAnswerId: q.acceptedAnswerId ? String(q.acceptedAnswerId) : undefined,
    ...(opts.acceptedAnswer ? { acceptedAnswer: opts.acceptedAnswer } : {}),
    answeredByMe: opts.answeredByMe,
    createdAt: iso(q.createdAt)!,
  };
}

export function toContentDocumentDto(
  d: IContentDocument,
  sourceTextbook?: ContentDocumentDto["sourceTextbook"],
): ContentDocumentDto {
  return {
    id: String(d._id),
    materialId: String(d.materialId),
    documentType: d.documentType,
    title: d.title,
    chapterNumber: d.chapterNumber,
    chapterTitle: d.chapterTitle,
    ...(sourceTextbook ? { sourceTextbook } : {}),
    contentBlocks: d.contentBlocks ?? [],
    createdByUpid: d.createdByUpid,
    lastEditedAt: iso(d.lastEditedAt),
    verificationTier: d.verificationTier,
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt)!,
  };
}
