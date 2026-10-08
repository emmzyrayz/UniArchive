// src/lib/badges.ts
// The badge award engine. After an action that could earn a badge, routes
// call awardBadgesAfter(userId, trigger): once the response is sent, the
// badges relevant to that trigger are checked and any newly earned ones are
// recorded (unseen, so the BadgeToast picks them up) and a notification
// is sent.
//
// - Never double-awards: the { userId, badgeId } unique index decides.
// - Never throws: a badge problem is logged, never the action's problem.
// - Badges are earned for good; they aren't taken back if a count drops.
import { after } from "next/server";
import { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { LIBRARY_BOOKS, getBookModel } from "@/lib/models/bookModel";
import { COMMUNITY_MATERIALS, getMaterialModel } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getCommentModel } from "@/lib/models/commentModel";
import { getUserBadgeModel, type IUserBadge } from "@/lib/models/userBadgeModel";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { redis } from "@/lib/redis";
import { notify } from "@/lib/notifications";
import {
  BADGE_DEFINITIONS,
  PDF_DETECTIVE_ACCEPTED,
  BADGE_IDS,
  EARLY_ADOPTER_DAYS,
  PLATFORM_LAUNCH_DATE,
  RARITY_RANK,
  TOP_CONTRIBUTOR_MIN_MATERIALS,
  TOP_CONTRIBUTOR_RANK,
  type BadgeDefinition,
  type BadgeId,
  type EarnedBadge,
} from "@/lib/constants/badges";

export type BadgeTrigger =
  | "book_uploaded"
  | "material_verified"
  | "tier2_endorsed"
  | "reaction_received"
  | "comment_upvoted"
  | "profile_completed"
  | "role_changed"
  | "view_milestone"
  | "school_email_verified"
  | "suggestion_accepted"
  // Every badge: catches up users who qualified before badges existed, or
  // whose check was missed (see catchUpBadgesAfter)
  | "catch_up";

// Which badges each trigger can affect; not every badge on every action
const TRIGGER_BADGES: Record<BadgeTrigger, BadgeId[]> = {
  book_uploaded: ["first_upload", "early_adopter"],
  material_verified: [
    "first_verified",
    "five_verified",
    "fifteen_verified",
    "fifty_verified",
    "school_pioneer",
    "top_contributor",
    "early_adopter",
  ],
  tier2_endorsed: ["endorsed"],
  reaction_received: ["first_reaction", "well_received"],
  comment_upvoted: ["helpful_commenter"],
  profile_completed: ["profile_complete"],
  role_changed: ["collaborator", "auditor", "verified_lecturer"],
  view_milestone: ["popular_material"],
  school_email_verified: ["verified_student"],
  suggestion_accepted: ["pdf_detective"],
  catch_up: BADGE_IDS,
};

// Everything the rules read about the user
const USER_FIELDS =
  "upid role createdAt verifiedMaterialCount universityId isVerified phone profilePhoto " +
  "fullName username bio dob facultyId departmentId level schoolEmailVerifiedAt";

type BadgeUser = {
  _id: Types.ObjectId;
  upid: string;
  role: string;
  createdAt: Date;
  verifiedMaterialCount?: number;
  universityId?: Types.ObjectId;
  schoolEmailVerifiedAt?: Date;
} & Parameters<typeof calculateProfileCompletion>[0];

async function qualifies(badgeId: BadgeId, user: BadgeUser): Promise<boolean> {
  const userId = user._id;
  const verified = user.verifiedMaterialCount ?? 0;
  switch (badgeId) {
    case "first_upload":
      return !!(await (await getBookModel()).exists({ uploaderId: userId, ...LIBRARY_BOOKS }));
    case "first_verified":
      return verified >= 1;
    case "five_verified":
      return verified >= 5;
    case "fifteen_verified":
      return verified >= 15;
    case "fifty_verified":
      return verified >= 50;
    case "endorsed":
      return !!(await (await getMaterialModel()).exists({ submittedBy: userId, verificationTier: "tier2", ...COMMUNITY_MATERIALS }));
    case "popular_material":
      return !!(await (await getMaterialModel()).exists({ submittedBy: userId, viewCount: { $gte: 100 }, ...COMMUNITY_MATERIALS }));
    case "first_reaction":
      return !!(await (await getMaterialModel()).exists({ submittedBy: userId, reactionCount: { $gte: 1 }, ...COMMUNITY_MATERIALS }));
    case "well_received":
      return !!(await (await getMaterialModel()).exists({ submittedBy: userId, reactionCount: { $gte: 10 }, ...COMMUNITY_MATERIALS }));
    case "helpful_commenter": {
      // aggregate() doesn't cast: userId must already be an ObjectId
      const [row] = await (await getCommentModel()).aggregate<{ total: number }>([
        { $match: { authorId: userId, isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$upvoteCount" } } },
      ]);
      return (row?.total ?? 0) >= 10;
    }
    case "early_adopter": {
      const cutoff = PLATFORM_LAUNCH_DATE.getTime() + EARLY_ADOPTER_DAYS * 24 * 60 * 60 * 1000;
      return new Date(user.createdAt).getTime() <= cutoff;
    }
    case "profile_complete":
      return calculateProfileCompletion(user).percentage === 100;
    case "school_pioneer": {
      // The first material ever verified from the user's university is theirs
      if (!user.universityId || verified < 1) return false;
      const first = await (await getMaterialModel())
        .findOne({ universityId: user.universityId, ...COMMUNITY_MATERIALS })
        .sort({ tier1VerifiedAt: 1, _id: 1 })
        .select("submittedBy")
        .lean();
      return !!first && String(first.submittedBy) === String(userId);
    }
    case "top_contributor": {
      if (!user.universityId || verified < TOP_CONTRIBUTOR_MIN_MATERIALS) return false;
      const top = await (await getMaterialModel()).aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { universityId: user.universityId, isActive: true, ...COMMUNITY_MATERIALS } },
        { $group: { _id: "$submittedBy", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: TOP_CONTRIBUTOR_RANK },
      ]);
      return top.some((t) => String(t._id) === String(userId) && t.count >= TOP_CONTRIBUTOR_MIN_MATERIALS);
    }
    case "verified_student":
      return !!user.schoolEmailVerifiedAt;
    case "pdf_detective":
      return (
        (await (await getMaterialSuggestionModel()).countDocuments({ userId, status: "accepted" })) >= PDF_DETECTIVE_ACCEPTED
      );
    case "collaborator":
      return user.role === "collaborator";
    case "auditor":
      return user.role === "auditor";
    case "verified_lecturer":
      return user.role === "lecturer";
    default:
      return false;
  }
}

/**
 * Checks the badges `trigger` can affect and awards any newly earned.
 * Returns the badges awarded now. Safe to call repeatedly; never throws.
 */
export async function checkAndAwardBadges(userId: string, trigger: BadgeTrigger): Promise<BadgeId[]> {
  const awarded: BadgeId[] = [];
  try {
    if (!Types.ObjectId.isValid(userId)) return awarded;
    const id = new Types.ObjectId(userId);
    const [User, UserBadge] = await Promise.all([getUserModel(), getUserBadgeModel()]);
    const [user, existing] = await Promise.all([
      User.findById(id).select(USER_FIELDS).lean<BadgeUser>(),
      UserBadge.find({ userId: id }).select("badgeId").lean<Pick<IUserBadge, "badgeId">[]>(),
    ]);
    if (!user) return awarded;

    const earned = new Set(existing.map((b) => b.badgeId));
    for (const badgeId of TRIGGER_BADGES[trigger] ?? []) {
      if (earned.has(badgeId)) continue;
      try {
        if (!(await qualifies(badgeId, user))) continue;
        await UserBadge.create({
          userId: id,
          userUpid: user.upid,
          badgeId,
          awardedAt: new Date(),
          awardedFor: trigger,
          seen: false,
        });
        awarded.push(badgeId);
        const def = BADGE_DEFINITIONS[badgeId];
        await notify(id, {
          type: "badge_earned",
          title: `You earned the ${def.emoji} ${def.name} badge`,
          body: def.description,
          link: "/profile",
          dedupeKey: `badge:${badgeId}`,
        });
      } catch (error) {
        // Awarded meanwhile by a parallel check: that's fine
        if ((error as { code?: number }).code !== 11000) {
          console.error(`[badges] ${badgeId} for ${userId} (${trigger}) failed:`, error);
        }
      }
    }
    if (awarded.length) console.info(`[badges] @${user.upid} earned ${awarded.join(", ")} (${trigger})`);
  } catch (error) {
    console.error(`[badges] check for ${userId} (${trigger}) failed:`, error);
  }
  return awarded;
}

/**
 * Runs checkAndAwardBadges after the response is sent. after() keeps the
 * work alive on serverless, where a bare un-awaited promise can be frozen
 * and dropped once the response is out.
 */
export function awardBadgesAfter(userId: string | Types.ObjectId, trigger: BadgeTrigger): void {
  const id = String(userId);
  after(() => checkAndAwardBadges(id, trigger));
}

// A full check is heavier, so each user gets at most one every few hours
const CATCH_UP_EVERY_SECONDS = 6 * 60 * 60;

/** Checks every badge for the user, at most once per CATCH_UP_EVERY_SECONDS. */
export function catchUpBadgesAfter(userId: string): void {
  after(async () => {
    try {
      const first = await redis.set(`badges:catch-up:${userId}`, "1", { nx: true, ex: CATCH_UP_EVERY_SECONDS });
      if (first) await checkAndAwardBadges(userId, "catch_up");
    } catch (error) {
      console.error("[badges] catch-up skipped:", error);
    }
  });
}

/** A stored badge in the shape the APIs return. */
export function toEarnedBadge(b: Pick<IUserBadge, "badgeId" | "awardedAt">): EarnedBadge | null {
  const def = BADGE_DEFINITIONS[b.badgeId];
  return def ? { ...def, badgeId: b.badgeId, awardedAt: new Date(b.awardedAt).toISOString() } : null;
}

/** All badges a user holds, newest first. */
export async function listBadges(userId: Types.ObjectId | string): Promise<EarnedBadge[]> {
  const UserBadge = await getUserBadgeModel();
  const rows = await UserBadge.find({ userId: new Types.ObjectId(String(userId)) })
    .sort({ awardedAt: -1 })
    .select("badgeId awardedAt")
    .lean<Pick<IUserBadge, "badgeId" | "awardedAt">[]>();
  return rows.map(toEarnedBadge).filter((b): b is EarnedBadge => b !== null);
}

/**
 * Each uploader's rarest badge (newest among equals), only when it's rare
 * or legendary: the one shown next to their name on material cards.
 */
export async function topBadgesFor(
  userIds: (Types.ObjectId | string)[],
): Promise<Map<string, BadgeDefinition>> {
  const ids = [...new Set(userIds.map(String))].filter((id) => Types.ObjectId.isValid(id));
  const result = new Map<string, BadgeDefinition>();
  if (ids.length === 0) return result;

  const UserBadge = await getUserBadgeModel();
  const rows = await UserBadge.find({ userId: { $in: ids.map((id) => new Types.ObjectId(id)) } })
    .select("userId badgeId awardedAt")
    .lean<Pick<IUserBadge, "userId" | "badgeId" | "awardedAt">[]>();

  const best = new Map<string, { def: BadgeDefinition; at: number }>();
  for (const row of rows) {
    const def = BADGE_DEFINITIONS[row.badgeId];
    if (!def || RARITY_RANK[def.rarity] < RARITY_RANK.rare) continue;
    const key = String(row.userId);
    const at = new Date(row.awardedAt).getTime();
    const current = best.get(key);
    if (
      !current ||
      RARITY_RANK[def.rarity] > RARITY_RANK[current.def.rarity] ||
      (RARITY_RANK[def.rarity] === RARITY_RANK[current.def.rarity] && at > current.at)
    ) {
      best.set(key, { def, at });
    }
  }
  for (const [key, { def }] of best) result.set(key, def);
  return result;
}
