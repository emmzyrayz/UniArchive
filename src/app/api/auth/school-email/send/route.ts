// POST /api/auth/school-email/send
// Body: { schoolEmail, universityId } (a catalog university), or { school }
// (a name, from older app versions).
// Signup's optional "School email" step: checks that the address belongs to
// the picked school (lib/schoolEmail.ts), emails it a 6-digit code and
// returns a challenge token the browser sends back with the code. The
// account doesn't exist yet, so the challenge lives in its own collection
// (models/schoolEmailChallengeModel.ts).
import { NextResponse, type NextRequest } from "next/server";
import { hashForSearch } from "@/lib/encryption";
import { asTrimmedString, getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { isValidObjectId } from "mongoose";
import { checkSchoolEmail, schoolEmailError, type SchoolInfo } from "@/lib/schoolEmail";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { SchoolEmailError, startSchoolEmailChallenge } from "@/lib/schoolEmailChallenge";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "authEmail", `school-email:${getClientIp(request)}`);

    const body = await readJson<{ schoolEmail: string; school: string; universityId: string }>(request);
    let info: SchoolInfo = { name: asTrimmedString(body?.school, 200) };
    if (typeof body?.universityId === "string" && body.universityId) {
      const uni = isValidObjectId(body.universityId)
        ? await (await getUniversityModel())
            .findOne({ _id: body.universityId, isActive: true })
            .select("name abbreviation website")
            .lean<{ name: string; abbreviation?: string; website?: string }>()
        : null;
      if (!uni) return NextResponse.json({ message: "Pick your institution on the Profile step again." }, { status: 400 });
      info = { name: uni.name, abbreviation: uni.abbreviation, website: uni.website };
    }
    const school = info.name;
    const check = checkSchoolEmail(asTrimmedString(body?.schoolEmail, 254), info);
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
