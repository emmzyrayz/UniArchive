// src/lib/constants/reactions.ts
// The UniLibrary's reactions: academic signals rather than generic likes,
// the kind of thing a lecturer weighs up for a tier 2 endorsement.
export const REACTION_TYPES = ["helpful", "excellent", "accurate"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTIONS: Record<ReactionType, { emoji: string; label: string; meaning: string }> = {
  helpful: { emoji: "👍", label: "Helpful", meaning: "This helped me study" },
  excellent: { emoji: "⭐", label: "Excellent", meaning: "Excellent quality material" },
  accurate: { emoji: "🎯", label: "Accurate", meaning: "Content is accurate" },
};

export type ReactionCounts = Record<ReactionType, number>;

export const EMPTY_REACTIONS: ReactionCounts = { helpful: 0, excellent: 0, accurate: 0 };

export const isReactionType = (value: unknown): value is ReactionType =>
  typeof value === "string" && (REACTION_TYPES as readonly string[]).includes(value);
