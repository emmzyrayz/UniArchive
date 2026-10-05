// POST /api/user/school-email/verify  { challengeToken, code }
// Settings: checks the code and stores the school email on the account
// (replacing any earlier one), then awards the verified_student badge.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { SchoolEmailError } from "@/lib/schoolEmailChallenge";
import { verifySettingsSchoolEmail } from "@/lib/userSchoolEmail";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "auth", `school-email-settings-verify:${session.userId}`);
    const body = await readJson<{ challengeToken: string; code: string }>(request);
    const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    return NextResponse.json(await verifySettingsSchoolEmail(session.userId, token, code));
  } catch (error) {
    if (error instanceof SchoolEmailError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "POST /api/user/school-email/verify");
  }
}
