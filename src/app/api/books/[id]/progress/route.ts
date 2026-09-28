// PATCH /api/books/[id]/progress
// The reader reports reading progress every ~30s, when hidden and on close.
// Body: { currentPage, totalPages, sessionSeconds, pagesViewedThisSession,
//         newSession? }
//   sessionSeconds          active time since the last report (the reader
//                           excludes idle and hidden time)
//   pagesViewedThisSession  distinct pages viewed since the last report
//   newSession              true on the first report after opening the book
//
// Anyone who can read the book tracks their own progress (owner, or any
// reader of a published UniLibrary book). One atomic pipeline update keeps
// furthestPage, percentComplete and the counters consistent.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { findReadableBook } from "@/lib/bookAccess";
import { getReadingProgressModel } from "@/lib/models/readingProgressModel";
import { readingDay } from "@/lib/readingStats";

type Context = { params: Promise<{ id: string }> };

const MAX_PAGES = 100_000;
// Reports come every 30s; a few failed ones can be retried together
const MAX_SECONDS_PER_REPORT = 600;
const MAX_PAGES_PER_REPORT = 500;

const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `reading-progress:${session.userId}`);
    const found = await findReadableBook((await context.params).id, session);
    if (!found) return fail(404, "Book not found.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");
    const { totalPages, currentPage, sessionSeconds, pagesViewedThisSession } = body;
    if (!isInt(totalPages, 1, MAX_PAGES)) return fail(400, "totalPages must be a positive whole number.");
    if (!isInt(currentPage, 1, MAX_PAGES)) return fail(400, "currentPage must be a positive whole number.");
    if (!isInt(sessionSeconds, 0, MAX_SECONDS_PER_REPORT)) {
      return fail(400, `sessionSeconds must be 0-${MAX_SECONDS_PER_REPORT}.`);
    }
    if (!isInt(pagesViewedThisSession, 0, MAX_PAGES_PER_REPORT)) {
      return fail(400, `pagesViewedThisSession must be 0-${MAX_PAGES_PER_REPORT}.`);
    }
    const newSession = body.newSession === true;

    const page = Math.min(currentPage, totalPages);
    const pagesRead = Math.min(pagesViewedThisSession, totalPages);
    const now = new Date();
    const ifNull = (field: string, fallback: unknown) => ({ $ifNull: [`$${field}`, fallback] });

    const ReadingProgress = await getReadingProgressModel();
    await ReadingProgress.updateOne(
      { userId: new Types.ObjectId(session.userId), bookId: found.book._id },
      [
        {
          $set: {
            currentPage: page,
            totalPages,
            furthestPage: { $min: [totalPages, { $max: [ifNull("furthestPage", 0), page] }] },
            totalTimeSeconds: { $add: [ifNull("totalTimeSeconds", 0), sessionSeconds] },
            totalPagesRead: { $add: [ifNull("totalPagesRead", 0), pagesRead] },
            sessionCount: newSession
              ? { $add: [ifNull("sessionCount", 0), 1] }
              : ifNull("sessionCount", 0),
            lastSessionSeconds: newSession
              ? sessionSeconds
              : { $add: [ifNull("lastSessionSeconds", 0), sessionSeconds] },
            // Only a report with real reading time marks the day as read
            readDays:
              sessionSeconds > 0 || pagesRead > 0
                ? { $setUnion: [ifNull("readDays", []), [readingDay(now)]] }
                : ifNull("readDays", []),
            lastReadAt: now,
            firstReadAt: ifNull("firstReadAt", now),
            createdAt: ifNull("createdAt", now),
            updatedAt: now,
          },
        },
        {
          $set: {
            percentComplete: {
              $round: [{ $multiply: [{ $divide: ["$furthestPage", "$totalPages"] }, 100] }, 1],
            },
          },
        },
      ],
      { upsert: true, timestamps: false },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/books/[id]/progress");
  }
}
