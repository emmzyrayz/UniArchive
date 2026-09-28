// GET /api/user/badges/new
// Badges the signed-in user hasn't been shown yet, marked seen as they're
// returned (the BadgeToast polls this). Only the returned badges are marked,
// so one awarded mid-request is kept for the next poll. Also schedules the
// throttled catch-up check, so users who qualified earlier get their badges.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getUserBadgeModel, type IUserBadge } from "@/lib/models/userBadgeModel";
import { catchUpBadgesAfter, toEarnedBadge } from "@/lib/badges";
import type { EarnedBadge } from "@/lib/constants/badges";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    catchUpBadgesAfter(session.userId);

    const UserBadge = await getUserBadgeModel();
    const unseen = await UserBadge.find({ userId: new Types.ObjectId(session.userId), seen: false })
      .sort({ awardedAt: 1 })
      .select("badgeId awardedAt")
      .lean<Pick<IUserBadge, "_id" | "badgeId" | "awardedAt">[]>();
    if (unseen.length > 0) {
      await UserBadge.updateMany({ _id: { $in: unseen.map((b) => b._id) } }, { $set: { seen: true } });
    }

    const badges = unseen.map(toEarnedBadge).filter((b): b is EarnedBadge => b !== null);
    return NextResponse.json({ badges }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/badges/new");
  }
}
