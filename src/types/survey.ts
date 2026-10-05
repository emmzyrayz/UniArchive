// src/types/survey.ts
// Shapes the survey results API returns (client-safe).
import type { AnswerValue } from "@/lib/survey/questions";

export interface CountRow {
  /** Option id, "other", "yes"/"no", a number as text, or a facet value */
  key: string;
  label: string;
  count: number;
}

interface BaseSummary {
  questionId: string;
  answered: number;
  skipped: number;
}

export type QuestionSummary =
  | (BaseSummary & {
      kind: "choice";
      /** Every option (zero counts included) plus "Other" when allowed */
      rows: CountRow[];
      /** multi_choice: people can pick several, so rows add up to more than `answered` */
      multi: boolean;
      otherTexts: string[];
    })
  | (BaseSummary & { kind: "yes_no"; rows: CountRow[] })
  | (BaseSummary & {
      kind: "numeric";
      average: number | null;
      median: number | null;
      min: number | null;
      max: number | null;
      /** rating 1-5, scale min..max (every value), number: up to 10 ranges */
      rows: CountRow[];
      /** 0-10 scales: the usual "would you recommend" breakdown */
      nps?: { promoters: number; passives: number; detractors: number; score: number };
    })
  | (BaseSummary & { kind: "text"; latest: string[] });

export interface SurveyFacets {
  schools: CountRow[];
  faculties: CountRow[];
  departments: CountRow[];
  levels: CountRow[];
  roles: CountRow[];
  accounts: CountRow[];
}

export interface SurveyResultsResponse {
  total: number;
  /** Responses that match the filters */
  matched: number;
  summaries: QuestionSummary[];
  facets: SurveyFacets;
  /** Responses per day (Lagos time), oldest first */
  timeline: { day: string; count: number }[];
  /** True when more responses matched than the summary reads at once */
  truncated: boolean;
}

export interface SurveyResponseRow {
  id: string;
  submittedAt: string;
  updatedAt: string;
  editCount: number;
  account: { upid: string; name: string } | null;
  respondent: {
    name?: string;
    email?: string;
    role?: string;
    level?: string;
    school?: string;
    faculty?: string;
    department?: string;
    schoolUnlisted?: boolean;
    awaitingReview?: boolean;
  };
  answers: Record<string, AnswerValue>;
}

export interface SurveyResponsesResponse {
  responses: SurveyResponseRow[];
  total: number;
  page: number;
  totalPages: number;
}
