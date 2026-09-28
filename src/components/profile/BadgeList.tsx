// src/components/profile/BadgeList.tsx
// A user's badges as pills (emoji + name, description on hover), coloured
// by rarity. Used on /profile (your own) and /profile/[upid] (anyone's).
"use client";

import { useEffect, useState } from "react";
import type { BadgeRarity, EarnedBadge } from "@/lib/constants/badges";

const RARITY_STYLES: Record<BadgeRarity, string> = {
  common:
    "bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-neutral-700/40 dark:border-neutral-600 dark:text-neutral-200",
  uncommon:
    "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300",
  rare: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300",
  legendary:
    "badge-shimmer bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
};

export function BadgePill({ badge }: { badge: EarnedBadge }) {
  return (
    <span
      title={`${badge.description} (${badge.rarity})`}
      className={`inline-flex cursor-default items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${RARITY_STYLES[badge.rarity]}`}
    >
      <span aria-hidden>{badge.emoji}</span>
      <span>{badge.name}</span>
      <span className="sr-only">: {badge.description}</span>
    </span>
  );
}

type State = { url: string; badges: EarnedBadge[] } | { url: string; error: true };

/**
 * Loads badges from `url` (/api/user/badges or /api/users/[upid]/badges).
 * With no badges it shows `emptyText`, or nothing at all when that's unset.
 */
export function BadgeList({ url, emptyText }: { url: string; emptyText?: string }) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { badges: EarnedBadge[] };
        setState({ url, badges: data.badges });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ url, error: true });
      });
    return () => controller.abort();
  }, [url]);

  const current = state?.url === url ? state : null;
  if (!current || "error" in current) return null;
  if (current.badges.length === 0 && !emptyText) return null;

  return (
    <section aria-labelledby="badges-heading">
      <h2 id="badges-heading" className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Badges ({current.badges.length})
      </h2>
      {current.badges.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {current.badges.map((b) => (
            <BadgePill key={b.badgeId} badge={b} />
          ))}
        </div>
      )}
    </section>
  );
}
