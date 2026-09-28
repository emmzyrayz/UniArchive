// GET /api/user/reading-stats
// The signed-in user's reading totals for the dashboard: pages, time, books
// started/finished (90%+ counts as finished), current streak, bookmark and
// highlight counts, and the three most recently read books.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import {
  getReadingProgressModel,
  type IReadingProgress,
} from "@/lib/models/readingProgressModel";
import { getAnnotationModel } from "@/lib/models/annotationModel";
import { getBookModel } from "@/lib/models/bookModel";
import { calculateStreak } from "@/lib/readingStats";
import type { ReadingStats } from "@/types/dashboard";

const COMPLETED_PERCENT = 90;
const RECENT_BOOKS = 3;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const userId = new Types.ObjectId(session.userId);

    const [ReadingProgress, Annotation] = await Promise.all([
      getReadingProgressModel(),
      getAnnotationModel(),
    ]);
    const [progress, annotationCounts] = await Promise.all([
      ReadingProgress.find({ userId })
        .sort({ lastReadAt: -1 })
        .select(
          "bookId currentPage totalPages percentComplete totalTimeSeconds totalPagesRead readDays lastReadAt",
        )
        .lean<IReadingProgress[]>(),
      // Counted in the database; the arrays themselves never leave it
      Annotation.aggregate<{ bookmarks: number; highlights: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            bookmarks: { $sum: { $size: { $ifNull: ["$bookmarks", []] } } },
            highlights: { $sum: { $size: { $ifNull: ["$highlights", []] } } },
          },
        },
      ]),
    ]);

    const totalTimeSeconds = progress.reduce((sum, p) => sum + (p.totalTimeSeconds ?? 0), 0);

    const recent = progress.slice(0, RECENT_BOOKS);
    const Book = await getBookModel();
    const titles = new Map(
      (
        await Book.find({ _id: { $in: recent.map((p) => p.bookId) } })
          .select("title")
          .lean<{ _id: Types.ObjectId; title: string }[]>()
      ).map((b) => [String(b._id), b.title]),
    );

    const stats: ReadingStats = {
      totalPagesRead: progress.reduce((sum, p) => sum + (p.totalPagesRead ?? 0), 0),
      totalTimeMinutes: Math.round(totalTimeSeconds / 60),
      totalTimeHours: Number((totalTimeSeconds / 3600).toFixed(1)),
      booksStarted: progress.length,
      booksCompleted: progress.filter((p) => (p.percentComplete ?? 0) >= COMPLETED_PERCENT).length,
      totalBookmarks: annotationCounts[0]?.bookmarks ?? 0,
      totalHighlights: annotationCounts[0]?.highlights ?? 0,
      currentStreak: calculateStreak(progress.flatMap((p) => p.readDays ?? [])),
      recentBooks: recent.map((p) => ({
        bookId: String(p.bookId),
        title: titles.get(String(p.bookId)),
        currentPage: p.currentPage,
        totalPages: p.totalPages,
        percentComplete: p.percentComplete ?? 0,
        lastReadAt: new Date(p.lastReadAt).toISOString(),
      })),
    };
    return NextResponse.json(stats, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/reading-stats");
  }
}
