// POST /api/auth/school-email/send
// Signup's optional "School email" step: checks that the address belongs to
// the picked school (lib/schoolEmail.ts), emails it a 6-digit code and
// returns a challenge token the browser sends back with the code. The
// account doesn't exist yet, so the challenge lives in its own collection
// (models/schoolEmailChallengeModel.ts).
import { NextResponse, type NextRequest } from "next/server";
import { hashForSearch } from "@/lib/encryption";
import { asTrimmedString, getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";
import { SchoolEmailError, startSchoolEmailChallenge } from "@/lib/schoolEmailChallenge";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `school-email:${getClientIp(request)}`);

    const body = await readJson<{ schoolEmail: string; school: string }>(request);
    const school = asTrimmedString(body?.school, 200);
    const check = checkSchoolEmail(asTrimmedString(body?.schoolEmail, 254), school);
    if (!check.ok) {
      return NextResponse.json(
        { message: schoolEmailError(check, school), errors: { schoolEmail: schoolEmailError(check, school) } },
        { status: 400 },
      );
    }

    await enforceRateLimit(request, "schoolEmail", hashForSearch(check.email));
    const token = await startSchoolEmailChallenge(check.email, school);

    return NextResponse.json({ success: true, challengeToken: token });
  } catch (error) {
    if (error instanceof SchoolEmailError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "school-email/send");
  }
}
