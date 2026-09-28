// GET  /api/materials/[id]/react - the signed-in user's reaction to this
//                                  material ({ reactionType: null } if none)
// POST /api/materials/[id]/react - react. Body: { reactionType }
//   Same type as before: removes it (toggle off). Different type: replaces
//   it. None yet: adds it. Not allowed on your own material.
//
// Each case is decided by one atomic operation on the Reaction document
// (delete / update-if-different / create under the unique index), and the
// Material totals move in a single $inc that updates the per-type count and
// reactionCount together. So double clicks and parallel tabs can't drift the
// counts. The reply carries the fresh totals and the user's reaction, so the
// client can settle on the server's state.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail, isDuplicateKey } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getReactionModel } from "@/lib/models/reactionModel";
import {
  EMPTY_REACTIONS,
  REACTION_TYPES,
  isReactionType,
  type ReactionCounts,
  type ReactionType,
} from "@/lib/constants/reactions";
import { awardBadgesAfter } from "@/lib/badges";

type Context = { params: Promise<{ id: string }> };

type Action = "added" | "changed" | "removed";

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");

    const Reaction = await getReactionModel();
    const reaction = await Reaction.findOne({
      materialId: new Types.ObjectId(id),
      userId: new Types.ObjectId(session.userId),
    })
      .select("reactionType")
      .lean();
    return NextResponse.json(
      { reactionType: reaction?.reactionType ?? null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]/react");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `react:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");

    const body = await readJson(request);
    const reactionType = body?.reactionType;
    if (!isReactionType(reactionType)) {
      return fail(400, `reactionType must be one of: ${REACTION_TYPES.join(", ")}.`);
    }

    const Material = await getMaterialModel();
    const material = await Material.findOne({ _id: id, isActive: true })
      .select("submittedBy")
      .lean();
    if (!material) return fail(404, "Material not found.");
    const uploaderId = material.submittedBy;
    if (String(material.submittedBy) === session.userId) {
      return fail(403, "You cannot react to your own material.");
    }

    const Reaction = await getReactionModel();
    const materialId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(session.userId);
    const mine = { materialId, userId };

    let action: Action;
    let inc: Record<string, number>;

    // 1. Same reaction again: toggle it off
    const removed = await Reaction.findOneAndDelete({ ...mine, reactionType }).lean();
    if (removed) {
      action = "removed";
      inc = { [`reactions.${reactionType}`]: -1, reactionCount: -1 };
    } else {
      // 2. A different reaction: switch it (returns the old one)
      const previous = await Reaction.findOneAndUpdate(
        { ...mine, reactionType: { $ne: reactionType } },
        { $set: { reactionType } },
        { returnDocument: "before" },
      ).lean();
      if (previous) {
        action = "changed";
        inc = { [`reactions.${previous.reactionType}`]: -1, [`reactions.${reactionType}`]: 1 };
      } else {
        // 3. No reaction yet: add one. A parallel request may have added it
        // first; the unique index turns that into "already reacted".
        try {
          await Reaction.create({ ...mine, userUpid: session.upid, reactionType });
          action = "added";
          inc = { [`reactions.${reactionType}`]: 1, reactionCount: 1 };
        } catch (error) {
          if (!isDuplicateKey(error)) throw error;
          return currentState(Material, Reaction, materialId, userId, "added");
        }
      }
    }

    const updated = await Material.findByIdAndUpdate(
      id,
      { $inc: inc },
      { returnDocument: "after", timestamps: false },
    )
      .select("reactions reactionCount")
      .lean();

    // The uploader may have earned first_reaction / well_received
    if (action === "added") awardBadgesAfter(uploaderId, "reaction_received");

    return NextResponse.json({
      action,
      reactionType: action === "removed" ? null : reactionType,
      reactions: { ...EMPTY_REACTIONS, ...updated?.reactions },
      reactionCount: updated?.reactionCount ?? 0,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/react");
  }
}

/** The totals and this user's reaction as they stand, after losing a race. */
async function currentState(
  Material: Awaited<ReturnType<typeof getMaterialModel>>,
  Reaction: Awaited<ReturnType<typeof getReactionModel>>,
  materialId: Types.ObjectId,
  userId: Types.ObjectId,
  action: Action,
) {
  const [material, reaction] = await Promise.all([
    Material.findById(materialId).select("reactions reactionCount").lean(),
    Reaction.findOne({ materialId, userId }).select("reactionType").lean(),
  ]);
  const reactions: ReactionCounts = { ...EMPTY_REACTIONS, ...material?.reactions };
  const reactionType: ReactionType | null = reaction?.reactionType ?? null;
  return NextResponse.json({
    action,
    reactionType,
    reactions,
    reactionCount: material?.reactionCount ?? 0,
  });
}
