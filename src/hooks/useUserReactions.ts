// src/hooks/useUserReactions.ts
// The signed-in user's reaction to each material on screen, fetched in
// batches from GET /api/materials/reactions (no request per card). Only ids
// not fetched yet are requested, so "Load more" asks for the new page only.
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactionType } from "@/lib/constants/reactions";

const BATCH = 50;

type ReactionMap = Record<string, ReactionType | null>;

/**
 * `userKey` identifies the signed-in user (e.g. their upid); pass null when
 * signed out. A different user starts from scratch.
 */
export function useUserReactions(materialIds: string[], userKey: string | null): ReactionMap {
  const [state, setState] = useState<{ userKey: string | null; map: ReactionMap }>({ userKey, map: {} });
  const requested = useRef<{ userKey: string | null; ids: Set<string> }>({ userKey, ids: new Set() });

  // Signed in as someone else (or out): forget the previous user's reactions
  if (state.userKey !== userKey) setState({ userKey, map: {} });

  const idsKey = materialIds.join(",");

  useEffect(() => {
    if (!userKey) return;
    if (requested.current.userKey !== userKey) requested.current = { userKey, ids: new Set() };
    const asked = requested.current.ids;
    const missing = idsKey.split(",").filter((id) => id && !asked.has(id));
    if (missing.length === 0) return;
    for (const id of missing) asked.add(id);

    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += BATCH) batches.push(missing.slice(i, i + BATCH));

    Promise.all(
      batches.map(async (batch) => {
        const res = await fetch(`/api/materials/reactions?ids=${batch.join(",")}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return ((await res.json()) as { reactions: ReactionMap }).reactions;
      }),
    )
      .then((results) => {
        setState((prev) =>
          prev.userKey === userKey ? { userKey, map: Object.assign({}, prev.map, ...results) } : prev,
        );
      })
      .catch((error) => {
        // Let a later render ask again; cards just show no highlight meanwhile
        for (const id of missing) asked.delete(id);
        console.warn("Failed to load your reactions:", error);
      });
  }, [idsKey, userKey]);

  return state.userKey === userKey ? state.map : {};
}
