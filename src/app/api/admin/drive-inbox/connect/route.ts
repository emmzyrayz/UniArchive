// GET /api/admin/drive-inbox/connect
// Starts connecting UniArchive's Google account to the Drive inbox: sends
// the admin to Google (drive.readonly, offline access) with a one-time
// state in a short-lived cookie that ./callback checks.
// Permission: "material.drive_inbox".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { InboxError, STATE_COOKIE, inboxAuthUrl } from "@/lib/drive/inbox";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "material.drive_inbox");
    let target;
    try {
      target = inboxAuthUrl();
    } catch (error) {
      if (!(error instanceof InboxError)) throw error;
      const back = new URL("/admin/materials/drive-inbox", request.url);
      back.searchParams.set("error", error.message);
      return NextResponse.redirect(back);
    }
    const res = NextResponse.redirect(target.url);
    res.cookies.set(STATE_COOKIE, target.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/admin/drive-inbox",
      maxAge: 10 * 60,
    });
    return res;
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/drive-inbox/connect");
  }
}
