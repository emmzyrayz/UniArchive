// src/lib/models/annotationModel.ts
// A reader's highlights and bookmarks on one book: one document per user per
// book. The reader replaces both arrays wholesale on every save.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { DEFAULT_HIGHLIGHT_COLOR } from "@/lib/constants/annotations";

export interface IHighlight {
  id: string; // client-generated
  pageNumber: number;
  // Percentages of the page, so they survive zoom and screen size changes
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  note?: string;
  createdAt: Date;
}

export interface IBookmark {
  id: string; // client-generated
  pageNumber: number;
  label?: string;
  scrollPosition?: number;
  createdAt: Date;
}

export interface IAnnotation {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  bookId: Types.ObjectId;
  highlights: IHighlight[];
  bookmarks: IBookmark[];
  // Bumped by every save. A save must name the version it was based on, so
  // a tab working from an older copy gets a conflict instead of silently
  // overwriting another tab's changes.
  syncVersion: number;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IAnnotationModel = Model<IAnnotation>;

const HighlightSchema = new Schema<IHighlight>(
  {
    id: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    text: { type: String, default: "" },
    color: { type: String, required: true, default: DEFAULT_HIGHLIGHT_COLOR },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BookmarkSchema = new Schema<IBookmark>(
  {
    id: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    label: { type: String },
    scrollPosition: { type: Number },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AnnotationSchema = new Schema<IAnnotation, IAnnotationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    highlights: { type: [HighlightSchema], default: [] },
    bookmarks: { type: [BookmarkSchema], default: [] },
    syncVersion: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One document per user per book; also serves "all of this user's annotations"
AnnotationSchema.index({ userId: 1, bookId: 1 }, { unique: true });
// Deleting a book removes every reader's annotations on it
AnnotationSchema.index({ bookId: 1 });

export async function getAnnotationModel(): Promise<IAnnotationModel> {
  const conn = await connectDB();
  return (
    (conn.models.Annotation as IAnnotationModel | undefined) ??
    conn.model<IAnnotation, IAnnotationModel>("Annotation", AnnotationSchema)
  );
}
