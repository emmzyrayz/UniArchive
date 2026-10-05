// GET /api/user/school-email
// The signed-in user's school email status for Settings: their profile
// school, the verified school email (masked) and when. See
// lib/userSchoolEmail.ts.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { SchoolEmailError } from "@/lib/schoolEmailChallenge";
import { schoolEmailStatus } from "@/lib/userSchoolEmail";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    return NextResponse.json(await schoolEmailStatus(session.userId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SchoolEmailError) return NextResponse.json({ message: error.message }, { status: error.status });
    return handleRouteError(error, "GET /api/user/school-email");
  }
}
