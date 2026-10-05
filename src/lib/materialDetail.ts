// src/lib/materialDetail.ts
// One UniLibrary material's public detail, shared by GET /api/materials/[id]
// and the server-rendered /materials/[id] page, plus a short preview of its
// typed questions and notes so the page's HTML carries the text people
// search for (course code + the actual questions).
import { cache } from "react";
import { isValidObjectId } from "mongoose";
import { getMaterialModel, type IMaterial } from "@/lib/models/materialModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import { PUBLIC_MATERIAL_FIELDS, toMaterialSummaries, type PublicMaterialDoc } from "@/lib/publicMaterials";
import type { MaterialDetail } from "@/types/layer2";

/** The material as its page and API show it, or null if missing/inactive. */
async function loadMaterialDetail(id: string): Promise<(MaterialDetail & { updatedAt: string }) | null> {
  if (!isValidObjectId(id)) return null;
  const Material = await getMaterialModel();
  const doc = await Material.findOne({ _id: id, isActive: true })
    .select(`${PUBLIC_MATERIAL_FIELDS} outline updatedAt`)
    .lean<PublicMaterialDoc & Pick<IMaterial, "outline"> & { updatedAt?: Date }>();
  if (!doc) return null;

  const [Question, Doc] = await Promise.all([getTypedQuestionModel(), getContentDocumentModel()]);
  const [[summary], typedQuestionCount, typedNoteCount] = await Promise.all([
    toMaterialSummaries([doc]),
    Question.countDocuments({ materialId: doc._id }),
    Doc.countDocuments({ materialId: doc._id, isActive: true }),
  ]);
  return {
    ...summary,
    typedQuestionCount,
    typedNoteCount,
    outline: doc.outline ?? null,
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

// Once per request: generateMetadata and the page both need it
export const getMaterialDetail = cache(loadMaterialDetail);

export interface TypedPreview {
  questions: { label: string; text: string }[];
  notes: { title: string; documentType: string; chapterNumber?: number }[];
}

const PREVIEW_QUESTIONS = 30;
const PREVIEW_NOTES = 20;
const PREVIEW_TEXT_MAX = 400;

/** Plain text of a question: KaTeX delimiters dropped, whitespace tidied. */
function plainQuestion(text: string): string {
  const plain = text.replace(/\$\$?/g, "").replace(/\\[()[\]]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > PREVIEW_TEXT_MAX ? `${plain.slice(0, PREVIEW_TEXT_MAX - 1)}…` : plain;
}

/** The first typed questions and notes, for the page's crawlable preview. */
export const getTypedPreview = cache(async (materialId: string): Promise<TypedPreview> => {
  const [Question, Doc] = await Promise.all([getTypedQuestionModel(), getContentDocumentModel()]);
  const [questions, notes] = await Promise.all([
    Question.find({ materialId })
      .sort({ questionNumber: 1, questionPart: 1, _id: 1 })
      .limit(PREVIEW_QUESTIONS)
      .select("questionNumber questionPart questionText")
      .lean<{ questionNumber: number; questionPart?: string; questionText: string }[]>(),
    Doc.find({ materialId, isActive: true })
      .sort({ chapterNumber: 1, createdAt: 1, _id: 1 })
      .limit(PREVIEW_NOTES)
      .select("title documentType chapterNumber")
      .lean<{ title: string; documentType: string; chapterNumber?: number }[]>(),
  ]);
  return {
    questions: questions.map((q) => ({
      label: `${q.questionNumber}${q.questionPart ?? ""}`,
      text: plainQuestion(q.questionText),
    })),
    notes: notes.map((n) => ({
      title: n.title,
      documentType: n.documentType,
      ...(n.chapterNumber !== undefined && { chapterNumber: n.chapterNumber }),
    })),
  };
});
