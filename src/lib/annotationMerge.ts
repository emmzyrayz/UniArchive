// src/lib/annotationMerge.ts
// Merging the reader's highlights and bookmarks with the server's copy
// (readerContext's annotation sync). Pure, so it's unit-tested.
import type { Bookmark } from "@/types/reader";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Server items first, then anything added locally before the load finished. */
export function mergeById<T extends { id: string }>(server: T[], local: T[]): T[] {
  const ids = new Set(server.map((item) => item.id));
  return [...server, ...local.filter((item) => !ids.has(item.id))];
}

/**
 * Merges this tab's list with another tab's saved list, relative to `base`
 * (the last copy both agreed on). Additions from either side are kept; a
 * deletion on either side sticks (a plain union would resurrect items the
 * other tab deleted). An item both sides still have keeps this tab's
 * version when only this tab changed it (a note edited here), otherwise
 * theirs.
 */
export function threeWayMerge<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const baseById = new Map(base.map((i) => [i.id, i]));
  const localById = new Map(local.map((i) => [i.id, i]));
  const remoteIds = new Set(remote.map((i) => i.id));
  return [
    // Theirs, minus what this tab deleted, with this tab's edits
    ...remote
      .filter((i) => !(baseById.has(i.id) && !localById.has(i.id)))
      .map((theirs) => {
        const mine = localById.get(theirs.id);
        const original = baseById.get(theirs.id);
        const editedHere = mine && original && !same(mine, original);
        const editedThere = original && !same(theirs, original);
        return editedHere && !editedThere ? mine : theirs;
      }),
    // This tab's new items (ones in base but gone remotely were deleted there)
    ...local.filter((i) => !remoteIds.has(i.id) && !baseById.has(i.id)),
  ];
}

/** One bookmark per page, as the toggle assumes; the first one wins. */
export function onePerPage(bookmarks: Bookmark[]): Bookmark[] {
  const seen = new Set<number>();
  return bookmarks.filter((b) => !seen.has(b.pageNumber) && !!seen.add(b.pageNumber));
}

/** Whether two lists hold the same items with the same content, in any order. */
export function sameContent<T extends { id: string }>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((i) => [i.id, i]));
  return a.every((i) => byId.has(i.id) && same(i, byId.get(i.id)));
}
