// GET /api/user/highlights - every highlight the signed-in user has, across
//                            all their books, newest first, with book titles
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { listUserAnnotations } from "@/lib/annotations";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const highlights = await listUserAnnotations(session.userId, "highlights");
    return NextResponse.json(
      { highlights, total: highlights.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/user/highlights");
  }
}
