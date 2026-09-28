// GET /api/materials/reactions?ids=id1,id2,...
// The signed-in user's reaction to each listed material, in one request, so
// the feed can highlight their reactions without a call per card.
// Returns { reactions: { [materialId]: reactionType | null } }. At most 50
// ids; invalid ones are ignored.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getReactionModel } from "@/lib/models/reactionModel";
import type { ReactionType } from "@/lib/constants/reactions";

const MAX_IDS = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const ids = [
      ...new Set(
        (request.nextUrl.searchParams.get("ids") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => isValidObjectId(s)),
      ),
    ].slice(0, MAX_IDS);

    const result: Record<string, ReactionType | null> = Object.fromEntries(ids.map((id) => [id, null]));
    if (ids.length > 0) {
      const Reaction = await getReactionModel();
      const mine = await Reaction.find({
        materialId: { $in: ids.map((id) => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(session.userId),
      })
        .select("materialId reactionType")
        .lean();
      for (const r of mine) result[String(r.materialId)] = r.reactionType;
    }

    return NextResponse.json(
      { reactions: result },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/reactions");
  }
}
