// GET /api/auth/dev-mode
// Whether dev mode is on for this request (lib/auth/devAuth.ts) and which
// account it signs in as, for the floating "Dev mode" badge. Always
// { active: false } outside `next dev` on localhost.
import { NextResponse, type NextRequest } from "next/server";
import { devAuthActive, devAuthUpid, getDevSessionUser } from "@/lib/auth/devAuth";

export async function GET(request: NextRequest) {
  if (!devAuthActive(request.headers.get("host"))) return NextResponse.json({ active: false });
  const user = await getDevSessionUser();
  return NextResponse.json(
    user
      ? { active: true, upid: user.upid, fullName: user.fullName, role: user.role }
      : { active: true, missing: devAuthUpid() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
