// GET /api/auth/me
// Returns the signed-in user, or 401.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const User = await getUserModel();
    const user = await User.findById(session.userId)
      .select(
        "upid uuid role fullName school faculty department level isVerified profilePhoto createdAt",
      )
      .lean();
    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          upid: user.upid,
          uuid: user.uuid,
          role: user.role,
          fullName: user.fullName,
          school: user.school,
          faculty: user.faculty ?? "",
          department: user.department ?? "",
          level: user.level ?? "",
          isVerified: user.isVerified,
          profilePhoto: user.profilePhoto,
          joinedAt: user.createdAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "me");
  }
}
