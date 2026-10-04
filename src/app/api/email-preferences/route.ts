// POST /api/email-preferences: changes bulk-email choices from the personal
// link in a broadcast (/email-preferences?u=<upid>&t=<token>), no sign-in.
// Body { u, t, announcements?, newsletter? }. The token is checked against
// the account (lib/emailPrefs.ts); a wrong one gets the same 404 as an
// unknown upid.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getUserModel } from "@/lib/models/userModel";
import { EMAIL_KINDS, isValidEmailPrefsToken, updateEmailPrefs, type EmailPrefs } from "@/lib/emailPrefs";

const notFound = () => NextResponse.json({ message: "This link isn't valid." }, { status: 404 });

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `email-prefs-link:${getClientIp(request)}`);
    const body = await readJson<EmailPrefs & { u: string; t: string }>(request);
    const upid = typeof body?.u === "string" ? body.u : "";
    const token = typeof body?.t === "string" ? body.t : "";
    if (!/^[a-z0-9]{1,60}$/i.test(upid)) return notFound();

    const change: Partial<EmailPrefs> = {};
    for (const kind of EMAIL_KINDS) {
      if (typeof body?.[kind] === "boolean") change[kind] = body[kind];
    }
    if (Object.keys(change).length === 0) {
      return NextResponse.json({ message: "Nothing to change." }, { status: 400 });
    }

    const User = await getUserModel();
    const user = await User.findOne({ upid }).select("_id").lean<{ _id: Types.ObjectId }>();
    if (!user || !isValidEmailPrefsToken(user._id, token)) return notFound();

    const prefs = await updateEmailPrefs(user._id, change, "link");
    return prefs ? NextResponse.json(prefs) : notFound();
  } catch (error) {
    return handleRouteError(error, "POST /api/email-preferences");
  }
}
