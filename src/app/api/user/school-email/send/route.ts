// POST /api/user/school-email/send  { schoolEmail }
// Settings: checks the address belongs to the profile's school and emails
// it a code; returns the challenge token for /verify. Rate limited per
// user and per address, like signup.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { hashForSearch } from "@/lib/encryption";
import { normaliseSchoolEmail } from "@/lib/schoolEmail";
import { SchoolEmailError } from "@/lib/schoolEmailChallenge";
import { sendSettingsSchoolEmailCode } from "@/lib/userSchoolEmail";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "authEmail", `school-email-settings:${session.userId}`);
    const body = await readJson<{ schoolEmail: string }>(request);
    const value = asTrimmedString(body?.schoolEmail, 254);
    if (value) await enforceRateLimit(request, "schoolEmail", hashForSearch(normaliseSchoolEmail(value)));
    const { token, school } = await sendSettingsSchoolEmailCode(session.userId, value);
    return NextResponse.json({ ok: true, challengeToken: token, school });
  } catch (error) {
    if (error instanceof SchoolEmailError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "POST /api/user/school-email/send");
  }
}
