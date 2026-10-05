// types/needsTyping.ts
// Shapes for "Materials that need typing" (lib/needsTyping.ts), safe to
// import in client components.

export const NEEDS_TYPING_MAX = 24;

export interface NeedsTypingItem {
  id: string;
  title: string;
  courseCode?: string;
  school?: string;
  level?: string;
  kind: string;
  /** What the user would type: questions or notes */
  conversion: "questions" | "notes";
  pageCount?: number;
  viewCount: number;
  reason: string;
  /** Other people with this material open in the workspace */
  othersTyping: number;
}

export interface NeedsTypingResult {
  items: NeedsTypingItem[];
  /** False when the profile has no school/department: suggestions aren't near them */
  personalised: boolean;
}
