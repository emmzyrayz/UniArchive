// GET /api/institutions/universities?q=&limit=10&state=
// Public. Searches active universities by name or abbreviation, optionally
// filtered by state.
import { NextResponse, type NextRequest } from "next/server";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { handleRouteError } from "@/lib/api";
import { escapeRegex } from "@/lib/escapeRegex";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const state = searchParams.get("state")?.trim();
    const parsedLimit = parseInt(searchParams.get("limit") ?? "10", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 10;

    const University = await getUniversityModel();

    const filter: Record<string, unknown> = { isActive: true };

    if (q.length >= 2) {
      const escaped = escapeRegex(q);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { abbreviation: { $regex: escaped, $options: "i" } },
      ];
    }

    if (state) {
      filter.state = { $regex: escapeRegex(state), $options: "i" };
    }

    const universities = await University.find(filter)
      .select("name abbreviation state city type ownership usid")
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ universities });
  } catch (error) {
    return handleRouteError(error, "institutions/universities");
  }
}
