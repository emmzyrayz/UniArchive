// src/lib/constants/annotations.ts
// Limits shared by the reader (so it never builds a state the API rejects)
// and the annotations API.
export const MAX_HIGHLIGHTS = 200;
export const MAX_BOOKMARKS = 100;
export const MAX_HIGHLIGHT_TEXT = 1000;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_BOOKMARK_LABEL = 200;
export const DEFAULT_HIGHLIGHT_COLOR = "#FFEB3B";

/** The reader's highlight palette; the first is the default. */
export const HIGHLIGHT_COLORS = [
  { color: "#FFEB3B", label: "Yellow" },
  { color: "#A5D6A7", label: "Green" },
  { color: "#90CAF9", label: "Blue" },
  { color: "#F48FB1", label: "Pink" },
  { color: "#FFCC80", label: "Orange" },
  { color: "#CE93D8", label: "Purple" },
] as const;

/** "Yellow" for "#ffeb3b"; undefined for colours outside the palette. */
export function highlightColorName(color: string): string | undefined {
  return HIGHLIGHT_COLORS.find((c) => c.color === color.toUpperCase())?.label;
}
