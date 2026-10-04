// /api/user/email-preferences: the signed-in user's bulk-email choices
// (lib/emailPrefs.ts). Settings > Notifications.
// GET    { announcements, newsletter }
// PATCH  { announcements?, newsletter? } (booleans) -> the saved values
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getUserModel } from "@/lib/models/userModel";
import { EMAIL_KINDS, effectiveEmailPrefs, updateEmailPrefs, type EmailPrefs } from "@/lib/emailPrefs";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const User = await getUserModel();
    const user = await User.findById(session.userId).select("emailPrefs").lean<{ emailPrefs?: Partial<EmailPrefs> }>();
    if (!user) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    return NextResponse.json(effectiveEmailPrefs(user.emailPrefs), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/email-preferences");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `email-prefs:${session.userId}`);
    const body = await readJson<EmailPrefs>(request);
    const change: Partial<EmailPrefs> = {};
    for (const kind of EMAIL_KINDS) {
      if (body?.[kind] !== undefined) {
        if (typeof body[kind] !== "boolean") {
          return NextResponse.json({ message: `${kind} must be true or false.` }, { status: 400 });
        }
        change[kind] = body[kind];
      }
    }
    if (Object.keys(change).length === 0) {
      return NextResponse.json({ message: "Nothing to change." }, { status: 400 });
    }
    const prefs = await updateEmailPrefs(session.userId, change, "settings");
    if (!prefs) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    return NextResponse.json(prefs);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/user/email-preferences");
  }
}
