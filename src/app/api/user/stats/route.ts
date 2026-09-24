// GET /api/user/stats - document count, storage used, and recently opened
//                       books for the signed-in user's dashboard
import { NextResponse, type NextRequest } from "next/server";
import { getBookModel } from "@/lib/models/bookModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { toBookDto, type BookDoc } from "@/lib/dto/book";

const RECENT_LIMIT = 5;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const Book = await getBookModel();
    const filter = { uploaderId: session.userId };
    const [sizes, recent] = await Promise.all([
      Book.find(filter).select("fileSize").lean<Pick<BookDoc, "fileSize">[]>(),
      Book.find({ ...filter, lastOpenedAt: { $exists: true, $ne: null } })
        .sort({ lastOpenedAt: -1 })
        .limit(RECENT_LIMIT)
        .lean<BookDoc[]>(),
    ]);

    return NextResponse.json(
      {
        documentCount: sizes.length,
        totalStorageBytes: sizes.reduce((sum, b) => sum + (b.fileSize ?? 0), 0),
        recentBooks: recent.map(toBookDto),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/user/stats");
  }
}
