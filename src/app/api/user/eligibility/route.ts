// GET /api/user/eligibility
// The signed-in user's progress toward their next role: each condition with
// its current and required value, and whether they may apply now.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { loadEligibility } from "@/lib/roleApplications";
import type { EligibilityResponse } from "@/types/roleProgression";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const loaded = await loadEligibility(session.userId);
    if (!loaded) return NextResponse.json({ message: "User not found." }, { status: 404 });

    const body: EligibilityResponse = loaded.result
      ? {
          currentRole: loaded.role,
          nextRole: loaded.result.targetRole,
          eligible: loaded.result.eligible,
          conditions: loaded.result.conditions,
          progressPercent: loaded.result.progressPercent,
        }
      : {
          currentRole: loaded.role,
          nextRole: null,
          eligible: false,
          conditions: [],
          progressPercent: 100,
          message: "Your role is managed by admins.",
        };
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/eligibility");
  }
}
