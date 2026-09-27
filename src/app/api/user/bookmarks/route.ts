// GET /api/user/bookmarks - every bookmark the signed-in user has, across all
//                           their books, newest first, with book titles
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { listUserAnnotations } from "@/lib/annotations";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const bookmarks = await listUserAnnotations(session.userId, "bookmarks");
    return NextResponse.json(
      { bookmarks, total: bookmarks.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/user/bookmarks");
  }
}
