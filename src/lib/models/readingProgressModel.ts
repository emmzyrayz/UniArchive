// src/lib/models/readingProgressModel.ts
// How far a reader has got in one book, and how long they've spent on it.
// One document per user per book, updated by the reader every ~30s through
// PATCH /api/books/[id]/progress (a single atomic pipeline update).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface IReadingProgress {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // ref: User
  bookId: Types.ObjectId; // ref: Book

  // Progress
  currentPage: number; // last page viewed
  totalPages: number;
  furthestPage: number; // highest page reached
  percentComplete: number; // furthestPage / totalPages, 0-100

  // Reading stats
  totalTimeSeconds: number; // active reading time, idle and hidden time excluded
  totalPagesRead: number; // distinct pages per sync window, so revisits count
  lastSessionSeconds: number; // length of the most recent reading session
  sessionCount: number; // times the book was opened in the reader

  // Streaks: every day ("YYYY-MM-DD", Africa/Lagos) this book was read
  readDays: string[];
  lastReadAt: Date;
  firstReadAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type IReadingProgressModel = Model<IReadingProgress>;

const ReadingProgressSchema = new Schema<IReadingProgress, IReadingProgressModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },

    currentPage: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    furthestPage: { type: Number, default: 1 },
    percentComplete: { type: Number, default: 0 },

    totalTimeSeconds: { type: Number, default: 0 },
    totalPagesRead: { type: Number, default: 0 },
    lastSessionSeconds: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 },

    readDays: { type: [String], default: [] },
    lastReadAt: { type: Date, default: Date.now },
    firstReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ReadingProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });
ReadingProgressSchema.index({ userId: 1, lastReadAt: -1 });
// Deleting a book removes every reader's progress on it
ReadingProgressSchema.index({ bookId: 1 });

export async function getReadingProgressModel(): Promise<IReadingProgressModel> {
  const conn = await connectDB();
  return (
    (conn.models.ReadingProgress as IReadingProgressModel | undefined) ??
    conn.model<IReadingProgress, IReadingProgressModel>("ReadingProgress", ReadingProgressSchema)
  );
}
