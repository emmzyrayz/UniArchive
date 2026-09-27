// src/lib/annotations.ts
// Server helpers for reader annotations: validating the reader's full-state
// PUT body, and turning stored documents into the client shapes.
import { Types } from "mongoose";
import { getAnnotationModel, type IBookmark, type IHighlight } from "@/lib/models/annotationModel";
import { getBookModel } from "@/lib/models/bookModel";
import {
  MAX_BOOKMARKS,
  MAX_BOOKMARK_LABEL,
  MAX_HIGHLIGHTS,
  MAX_HIGHLIGHT_TEXT,
  MAX_NOTE_LENGTH,
} from "@/lib/constants/annotations";
import type { Annotations, Bookmark, Highlight } from "@/types/reader";

const MAX_ID_LENGTH = 64;
const MAX_PAGE = 100_000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LENGTH;

const isPage = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_PAGE;

const isPercent = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;

/** Optional string, trimmed and capped; "" becomes undefined. */
function optionalText(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** The client's timestamp when it's a real date, otherwise now. */
function toDate(v: unknown): Date {
  const date = typeof v === "string" ? new Date(v) : null;
  return date && !Number.isNaN(date.getTime()) ? date : new Date();
}

function parseHighlight(v: unknown): IHighlight | null {
  if (!isObject(v) || !isId(v.id) || !isPage(v.pageNumber)) return null;
  const { x, y, width, height, color } = v;
  if (!isPercent(x) || !isPercent(y) || !isPercent(width) || !isPercent(height)) return null;
  if (typeof color !== "string" || !HEX_COLOR.test(color)) return null;
  return {
    id: v.id,
    pageNumber: v.pageNumber,
    x,
    y,
    width,
    height,
    text: typeof v.text === "string" ? v.text.slice(0, MAX_HIGHLIGHT_TEXT) : "",
    color: color.toUpperCase(),
    note: optionalText(v.note, MAX_NOTE_LENGTH),
    createdAt: toDate(v.createdAt),
  };
}

function parseBookmark(v: unknown): IBookmark | null {
  if (!isObject(v) || !isId(v.id) || !isPage(v.pageNumber)) return null;
  const scroll = v.scrollPosition;
  return {
    id: v.id,
    pageNumber: v.pageNumber,
    label: optionalText(v.label, MAX_BOOKMARK_LABEL),
    scrollPosition:
      typeof scroll === "number" && Number.isFinite(scroll) && scroll >= 0 ? scroll : undefined,
    createdAt: toDate(v.createdAt),
  };
}

function parseList<T extends { id: string }>(
  value: unknown,
  name: string,
  max: number,
  parseItem: (v: unknown) => T | null,
): Parsed<T[]> {
  if (!Array.isArray(value)) return { ok: false, message: `${name} must be an array.` };
  if (value.length > max) return { ok: false, message: `At most ${max} ${name}.` };
  const items: T[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const item = parseItem(raw);
    if (!item) return { ok: false, message: `One of the ${name} is invalid.` };
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return { ok: true, value: items };
}

/** Validates the reader's PUT body: the complete highlights and bookmarks. */
export function parseAnnotationsBody(
  body: Record<string, unknown> | null,
): Parsed<{ highlights: IHighlight[]; bookmarks: IBookmark[] }> {
  if (!body) return { ok: false, message: "Invalid request body." };
  const highlights = parseList(body.highlights, "highlights", MAX_HIGHLIGHTS, parseHighlight);
  if (!highlights.ok) return highlights;
  const bookmarks = parseList(body.bookmarks, "bookmarks", MAX_BOOKMARKS, parseBookmark);
  if (!bookmarks.ok) return bookmarks;

  // One bookmark per page, as the reader's toggle assumes
  const pages = new Set<number>();
  const uniqueBookmarks = bookmarks.value.filter((b) => {
    if (pages.has(b.pageNumber)) return false;
    pages.add(b.pageNumber);
    return true;
  });
  return { ok: true, value: { highlights: highlights.value, bookmarks: uniqueBookmarks } };
}

export function toHighlightDto(h: IHighlight): Highlight {
  return {
    id: h.id,
    pageNumber: h.pageNumber,
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    text: h.text ?? "",
    color: h.color,
    ...(h.note ? { note: h.note } : {}),
    createdAt: new Date(h.createdAt).toISOString(),
  };
}

export function toBookmarkDto(b: IBookmark): Bookmark {
  return {
    id: b.id,
    pageNumber: b.pageNumber,
    ...(b.label ? { label: b.label } : {}),
    ...(b.scrollPosition != null ? { scrollPosition: b.scrollPosition } : {}),
    createdAt: new Date(b.createdAt).toISOString(),
  };
}

export function toAnnotationsDto(
  doc: { highlights?: IHighlight[]; bookmarks?: IBookmark[] } | null,
): Annotations {
  return {
    highlights: (doc?.highlights ?? []).map(toHighlightDto),
    bookmarks: (doc?.bookmarks ?? []).map(toBookmarkDto),
  };
}

type WithBook<T> = T & { bookId: string; bookTitle: string };

/**
 * Every bookmark or highlight the user has, across all their books, newest
 * first, each tagged with its book. Books that no longer exist are skipped.
 */
export async function listUserAnnotations(
  userId: string,
  kind: "bookmarks",
): Promise<WithBook<Bookmark>[]>;
export async function listUserAnnotations(
  userId: string,
  kind: "highlights",
): Promise<WithBook<Highlight>[]>;
export async function listUserAnnotations(
  userId: string,
  kind: "bookmarks" | "highlights",
): Promise<WithBook<Bookmark | Highlight>[]> {
  const Annotation = await getAnnotationModel();
  const docs = await Annotation.find({
    userId: new Types.ObjectId(userId),
    [`${kind}.0`]: { $exists: true },
  })
    .select(`bookId ${kind}`)
    .lean<Array<{ bookId: Types.ObjectId; bookmarks?: IBookmark[]; highlights?: IHighlight[] }>>();
  if (docs.length === 0) return [];

  const Book = await getBookModel();
  const books = await Book.find({ _id: { $in: docs.map((d) => d.bookId) } })
    .select("title")
    .lean<Array<{ _id: Types.ObjectId; title: string }>>();
  const titles = new Map(books.map((b) => [b._id.toString(), b.title]));

  const items: WithBook<Bookmark | Highlight>[] = [];
  for (const doc of docs) {
    const bookId = doc.bookId.toString();
    const bookTitle = titles.get(bookId);
    if (bookTitle === undefined) continue;
    const entries =
      kind === "bookmarks"
        ? (doc.bookmarks ?? []).map(toBookmarkDto)
        : (doc.highlights ?? []).map(toHighlightDto);
    for (const entry of entries) items.push({ ...entry, bookId, bookTitle });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
