// src/lib/constants/layer2.ts
// Layer 2 (typed content) rules shared by the APIs and the editors/viewers.
// Here rather than in the models so client code can use them without
// pulling in Mongoose.
import type { MaterialCategory } from "@/lib/constants/materialCategories";

export const QUESTION_TYPES = [
  "objective", // MCQ
  "theory", // long answer
  "calculation", // math/science workings
  "essay", // discursive
  "practical", // lab/practical
  "fill_in_blank",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  objective: "Objective (MCQ)",
  theory: "Theory",
  calculation: "Calculation",
  essay: "Essay",
  practical: "Practical",
  fill_in_blank: "Fill in the blank",
};

export const CONTENT_DOCUMENT_TYPES = ["lecture_note", "chapter_summary", "topic_explainer"] as const;
export type ContentDocumentType = (typeof CONTENT_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<ContentDocumentType, string> = {
  lecture_note: "Lecture note",
  chapter_summary: "Chapter summary",
  topic_explainer: "Topic explainer",
};

/** Typed questions only go on past question materials */
export const QUESTION_CATEGORIES: MaterialCategory[] = ["EXAMS"];
/** Typed notes go on notes and textbooks */
export const NOTE_CATEGORIES: MaterialCategory[] = ["LEARNING_AIDS", "BOOKS"];

export const LIMITS = {
  questionText: 5000,
  optionText: 1000,
  minOptions: 2,
  maxOptions: 6,
  questionPart: 5,
  maxQuestionNumber: 500,
  maxMarks: 1000,
  answerText: 10000,
  workings: 10000,
  explanation: 5000,
  documentTitle: 200,
  chapterTitle: 200,
  maxBlocks: 500,
  blockContent: 20000,
  blockDescription: 500,
} as const;
