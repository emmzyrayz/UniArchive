// GET /api/users/[upid]
// A user's public profile. No sign-in needed. Only public fields are ever
// read (see src/lib/publicProfile.ts); unknown and suspended accounts are
// both a plain 404. Rate-limited per IP to slow down scraping.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { findPublicUser, toPublicProfile } from "@/lib/publicProfile";

type Context = { params: Promise<{ upid: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    enforceRateLimit(request, "public-profile", 60);
    const user = await findPublicUser((await context.params).upid);
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });

    return NextResponse.json(
      { profile: toPublicProfile(user) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/users/[upid]");
  }
}
