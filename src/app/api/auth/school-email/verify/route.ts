// POST /api/auth/school-email/verify
// Checks the code sent by /api/auth/school-email/send. On success the
// challenge is marked verified and kept for SCHOOL_EMAIL_PROOF_TTL_MS, so
// /api/auth/register can store the school email on the new account.
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { SchoolEmailError, verifySchoolEmailChallenge } from "@/lib/schoolEmailChallenge";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth", `school-email-verify:${getClientIp(request)}`);

    const body = await readJson<{ challengeToken: string; code: string }>(request);
    const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    await verifySchoolEmailChallenge(token, code, null);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SchoolEmailError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "school-email/verify");
  }
}
