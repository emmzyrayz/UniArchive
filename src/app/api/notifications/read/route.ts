// POST /api/notifications/read
// Marks notifications read: { ids: [...] } (up to 100) or { all: true }.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { markNotificationsRead, unreadNotificationCount } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await readJson<{ ids: unknown; all: unknown }>(request);
    let target: string[] | "all";
    if (body?.all === true) target = "all";
    else if (Array.isArray(body?.ids) && body.ids.length <= 100 && body.ids.every((id) => typeof id === "string")) {
      target = body.ids as string[];
    } else {
      return NextResponse.json({ message: "Send ids (up to 100) or all: true." }, { status: 400 });
    }
    const changed = await markNotificationsRead(session.userId, target);
    const unread = await unreadNotificationCount(session.userId);
    return NextResponse.json({ changed, unread });
  } catch (error) {
    return handleRouteError(error, "POST /api/notifications/read");
  }
}
