// types/content.ts
// Structured content blocks written by the BlockEditor and stored on
// TextMaterial documents (and later on Topic documents).
export type ContentBlockType =
  | "title"
  | "subtitle"
  | "richText"
  | "formula"
  | "image";

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  description?: string;
  imageDescription?: string;
}

export const CONTENT_BLOCK_TYPES: readonly ContentBlockType[] = [
  "title",
  "subtitle",
  "richText",
  "formula",
  "image",
];
