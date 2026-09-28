// src/lib/constants/comments.ts
// Comment rules shared by the comments API and the comment section UI.

export const COMMENT_MAX_LENGTH = 1000;
/** The character counter appears past this length */
export const COMMENT_COUNTER_FROM = 800;

/**
 * Authors can fix a comment this soon after posting, and never after: on a
 * platform that values academic accuracy, a reply shouldn't lose the
 * comment it was answering.
 */
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Replies shown inline under each comment before "Show all replies" */
export const INLINE_REPLIES = 5;

/** A comment with this many reports is flagged for review (not removed) */
export const COMMENT_REPORT_THRESHOLD = 5;
