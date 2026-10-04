// src/lib/constants/badges.ts
// Badges are defined here in code; the database only records who earned
// which (UserBadge). The rules that award them are in src/lib/badges.ts.

export type BadgeId =
  // Contribution
  | "first_upload"
  | "first_verified"
  | "five_verified"
  | "fifteen_verified"
  | "fifty_verified"
  // Quality
  | "endorsed"
  | "top_contributor"
  | "popular_material"
  // Engagement
  | "first_reaction"
  | "well_received"
  | "helpful_commenter"
  // Community
  | "early_adopter"
  | "profile_complete"
  | "school_pioneer"
  | "verified_student"
  // Role
  | "collaborator"
  | "auditor"
  | "verified_lecturer";

export type BadgeRarity = "common" | "uncommon" | "rare" | "legendary";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
  category: "contribution" | "quality" | "engagement" | "community" | "role";
  rarity: BadgeRarity;
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  first_upload: {
    id: "first_upload",
    name: "First Upload",
    description: "Uploaded your first document to UniArchive",
    emoji: "📄",
    category: "contribution",
    rarity: "common",
  },
  first_verified: {
    id: "first_verified",
    name: "Verified Contributor",
    description: "Had your first material verified in the UniLibrary",
    emoji: "✅",
    category: "contribution",
    rarity: "common",
  },
  five_verified: {
    id: "five_verified",
    name: "Active Contributor",
    description: "5 verified materials in the UniLibrary",
    emoji: "📚",
    category: "contribution",
    rarity: "uncommon",
  },
  fifteen_verified: {
    id: "fifteen_verified",
    name: "Dedicated Contributor",
    description: "15 verified materials in the UniLibrary",
    emoji: "🏆",
    category: "contribution",
    rarity: "rare",
  },
  fifty_verified: {
    id: "fifty_verified",
    name: "UniArchive Legend",
    description: "50 verified materials — you are the library",
    emoji: "👑",
    category: "contribution",
    rarity: "legendary",
  },
  endorsed: {
    id: "endorsed",
    name: "Lecturer Endorsed",
    description: "A verified lecturer endorsed one of your materials",
    emoji: "⭐",
    category: "quality",
    rarity: "rare",
  },
  top_contributor: {
    id: "top_contributor",
    name: "Top Contributor",
    description: "One of the top 10 contributors at your university",
    emoji: "🎓",
    category: "quality",
    rarity: "rare",
  },
  popular_material: {
    id: "popular_material",
    name: "Popular Upload",
    description: "One of your materials reached 100 views",
    emoji: "🔥",
    category: "quality",
    rarity: "uncommon",
  },
  first_reaction: {
    id: "first_reaction",
    name: "First Reaction",
    description: "Someone reacted to your material for the first time",
    emoji: "👍",
    category: "engagement",
    rarity: "common",
  },
  well_received: {
    id: "well_received",
    name: "Well Received",
    description: "A material of yours collected 10 or more reactions",
    emoji: "🌟",
    category: "engagement",
    rarity: "uncommon",
  },
  helpful_commenter: {
    id: "helpful_commenter",
    name: "Helpful Commenter",
    description: "Your comments received 10 upvotes in total",
    emoji: "💬",
    category: "engagement",
    rarity: "uncommon",
  },
  early_adopter: {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Joined UniArchive in its first 90 days",
    emoji: "🚀",
    category: "community",
    rarity: "rare",
  },
  profile_complete: {
    id: "profile_complete",
    name: "Complete Profile",
    description: "Reached 100% profile completion",
    emoji: "✨",
    category: "community",
    rarity: "common",
  },
  school_pioneer: {
    id: "school_pioneer",
    name: "School Pioneer",
    description: "First verified contributor from your university",
    emoji: "🏫",
    category: "community",
    rarity: "legendary",
  },
  verified_student: {
    id: "verified_student",
    name: "Verified Student",
    description: "Confirmed a school email from your university",
    emoji: "🪪",
    category: "community",
    rarity: "common",
  },
  collaborator: {
    id: "collaborator",
    name: "Collaborator",
    description: "Earned the Collaborator role through contribution",
    emoji: "🤝",
    category: "role",
    rarity: "uncommon",
  },
  auditor: {
    id: "auditor",
    name: "Auditor",
    description: "Trusted to review and verify materials",
    emoji: "🔍",
    category: "role",
    rarity: "rare",
  },
  verified_lecturer: {
    id: "verified_lecturer",
    name: "Verified Lecturer",
    description: "Verified academic on UniArchive",
    emoji: "👨‍🏫",
    category: "role",
    rarity: "rare",
  },
};

export const BADGE_IDS = Object.keys(BADGE_DEFINITIONS) as BadgeId[];

export const isBadgeId = (value: unknown): value is BadgeId =>
  typeof value === "string" && value in BADGE_DEFINITIONS;

/** Higher is rarer; picks the badge shown next to an uploader's name. */
export const RARITY_RANK: Record<BadgeRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

// The platform launch date, for early_adopter. Set this to the actual first
// production deploy date.
export const PLATFORM_LAUNCH_DATE = new Date("2026-09-25T00:00:00Z");
export const EARLY_ADOPTER_DAYS = 90;

// top_contributor: top 10 at the university, and at least this many
// verified materials (otherwise a school's first 10 uploaders all qualify)
export const TOP_CONTRIBUTOR_RANK = 10;
export const TOP_CONTRIBUTOR_MIN_MATERIALS = 3;

/** A badge as the APIs return it. */
export interface EarnedBadge extends BadgeDefinition {
  badgeId: BadgeId;
  awardedAt: string;
}
