// types/layer2.ts
// Shapes returned by the Layer 2 (typed content) APIs.
import type { ContentBlock } from "@/types/content";
import type { ContentDocumentType, QuestionType } from "@/lib/constants/layer2";
import type { MaterialSummary } from "@/types/unilibrary";

export interface QuestionOptionDto {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface AnswerDto {
  id: string;
  questionId: string;
  submittedByUpid: string;
  answerText: string;
  workings?: string;
  explanation?: string;
  selectedOption?: string;
  isAccepted: boolean;
  acceptedAt?: string;
  /** "@upid (Role)" of whoever accepted it */
  acceptedBy?: { upid: string; role: string };
  upvoteCount: number;
  /** Only when the request was signed in */
  upvotedByMe?: boolean;
  createdAt: string;
}

export interface QuestionDto {
  id: string;
  materialId: string;
  submittedByUpid: string;
  questionNumber: number;
  questionPart?: string;
  questionText: string;
  questionType: QuestionType;
  marks?: number;
  options?: QuestionOptionDto[];
  answerCount: number;
  acceptedAnswerId?: string;
  /** The accepted answer, inline, so the list shows it without another call */
  acceptedAnswer?: AnswerDto;
  /** null when signed out */
  answeredByMe: boolean | null;
  createdAt: string;
}

export interface ContentDocumentDto {
  id: string;
  materialId: string;
  documentType: ContentDocumentType;
  title: string;
  chapterNumber?: number;
  chapterTitle?: string;
  sourceTextbook?: { id: string; title: string; submittedByUpid: string };
  contentBlocks: ContentBlock[];
  createdByUpid: string;
  lastEditedAt?: string;
  verificationTier?: "tier1" | "tier2";
  createdAt: string;
  updatedAt: string;
}

/** GET /api/materials/[id] */
export interface MaterialDetail extends MaterialSummary {
  typedQuestionCount: number;
  typedNoteCount: number;
}
