// GET /api/admin/drive-inbox/callback?code=&state=
// Google sends the admin back here after connecting the inbox account.
// Checks the one-time state from ./connect, trades the code for tokens
// (lib/drive/inbox.ts connectInbox) and returns to the admin page.
// Permission: "material.drive_inbox".
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { InboxError, STATE_COOKIE, connectInbox } from "@/lib/drive/inbox";

const sameState = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(request, "material.drive_inbox");
    const params = request.nextUrl.searchParams;
    const back = new URL("/admin/materials/drive-inbox", request.url);
    const finish = (key: "connected" | "error", value: string) => {
      back.searchParams.set(key, value);
      const res = NextResponse.redirect(back);
      res.cookies.set(STATE_COOKIE, "", { path: "/api/admin/drive-inbox", maxAge: 0 });
      return res;
    };

    const state = params.get("state") ?? "";
    const expected = request.cookies.get(STATE_COOKIE)?.value ?? "";
    if (!state || !expected || !sameState(state, expected)) {
      return finish("error", "That sign-in link expired. Click Connect again.");
    }
    if (params.get("error")) return finish("error", "Google sign-in was cancelled.");
    const code = params.get("code");
    if (!code) return finish("error", "Google didn't send a sign-in code. Try again.");

    try {
      const email = await connectInbox(code, session);
      return finish("connected", email);
    } catch (error) {
      if (error instanceof InboxError) return finish("error", error.message);
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/drive-inbox/callback");
  }
}
