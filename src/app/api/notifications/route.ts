// GET /api/notifications
// The signed-in user's notifications, newest first, plus the unread count.
// ?before=<id> pages on; ?count=1 returns only { unread } (the bell polls it).
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const params = request.nextUrl.searchParams;
    const unread = await unreadNotificationCount(session.userId);
    if (params.get("count") === "1") return NextResponse.json({ unread }, { headers: NO_STORE });
    const page = await listNotifications(session.userId, params.get("before") ?? undefined);
    return NextResponse.json({ ...page, unread }, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications");
  }
}
