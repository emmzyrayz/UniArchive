// GET /api/auth/connections
// Which sign-in methods the signed-in user has, for the settings page.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const User = await getUserModel();
    const user = await User.findById(session.userId).select("googleId password").lean();
    if (!user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json(
      { google: Boolean(user.googleId), password: Boolean(user.password) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "connections");
  }
}
