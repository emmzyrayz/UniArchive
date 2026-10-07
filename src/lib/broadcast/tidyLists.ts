// src/lib/broadcast/tidyLists.ts
// Deletes old per-broadcast contact lists from Brevo's "UniArchive
// broadcasts" folder. Each send makes its own list (lib/broadcast/send.ts);
// once the campaign has gone out it isn't needed (the campaign keeps its
// stats, and the contacts stay in Brevo).
//
// Which lists go:
//  - its broadcast is sent, failed or cancelled, at least KEEP_DAYS ago;
//  - no broadcast uses it (a send that failed before Brevo was asked to
//    send, then went back to draft; or the broadcast was deleted), and the
//    list is older than ORPHAN_HOURS.
// Kept: lists of scheduled or sending broadcasts, and any list whose name
// we didn't write ("UA broadcast <id> (<UTC stamp>)"), so a list someone
// puts in the folder by hand is never touched.
//
// Run weekly by Vercel Cron (/api/cron/tidy-brevo-lists) and by hand with
// `pnpm brevo:tidy-lists` (dry run unless --apply).
import { Types } from "mongoose";
import { BrevoError, deleteContactList, findBroadcastFolderId, folderLists } from "@/lib/brevo";
import { getBroadcastModel, type IBroadcast } from "@/lib/models/broadcastModel";

export const KEEP_DAYS = 30;
export const ORPHAN_HOURS = 24;
const DAY = 24 * 60 * 60 * 1000;

const NAME = /^UA broadcast ([0-9a-f]{24}) \((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)$/;

export interface TidyListsResult {
  dryRun: boolean;
  /** Lists in the folder */
  checked: number;
  deleted: { id: number; name: string; reason: string }[];
  kept: number;
  failed: { id: number; name: string; error: string }[];
  /** More lists were due than this run's limit allowed */
  more: boolean;
}

type Due = { reason: string } | null;

/** Whether a list can go, given the broadcast it belongs to (if any). */
export function listDue(
  list: { id: number; name: string },
  broadcast: Pick<IBroadcast, "status" | "brevoListId" | "sentAt" | "updatedAt"> | null,
  now: number,
): Due {
  const m = NAME.exec(list.name);
  if (!m) return null;
  const created = Date.parse(`${m[2].replace(" ", "T")}:00Z`);
  if (!Number.isFinite(created)) return null;

  const owns = broadcast && broadcast.brevoListId === list.id;
  if (!owns) {
    // The broadcast's current list is another one, or there is no broadcast
    return now - created >= ORPHAN_HOURS * 60 * 60 * 1000 ? { reason: broadcast ? "unused (send retried)" : "no broadcast" } : null;
  }
  if (broadcast.status === "scheduled" || broadcast.status === "sending" || broadcast.status === "draft") return null;
  const since = (broadcast.status === "sent" ? broadcast.sentAt : broadcast.updatedAt) ?? broadcast.updatedAt;
  if (!since || now - new Date(since).getTime() < KEEP_DAYS * DAY) return null;
  return { reason: `${broadcast.status} over ${KEEP_DAYS} days ago` };
}

export async function tidyBroadcastLists(options: { apply: boolean; limit?: number }): Promise<TidyListsResult> {
  const limit = options.limit ?? 50;
  const result: TidyListsResult = { dryRun: !options.apply, checked: 0, deleted: [], kept: 0, failed: [], more: false };
  const folderId = await findBroadcastFolderId();
  if (folderId === null) return result;

  const lists = await folderLists(folderId);
  result.checked = lists.length;
  const ids = lists.map((l) => NAME.exec(l.name)?.[1]).filter((id): id is string => !!id);
  const Broadcast = await getBroadcastModel();
  const broadcasts = await Broadcast.find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
    .select("status brevoListId sentAt updatedAt")
    .lean<Pick<IBroadcast, "_id" | "status" | "brevoListId" | "sentAt" | "updatedAt">[]>();
  const byId = new Map(broadcasts.map((b) => [String(b._id), b]));

  const now = Date.now();
  // Oldest first, so a capped run clears the backlog in order
  for (const list of [...lists].sort((a, b) => a.id - b.id)) {
    const id = NAME.exec(list.name)?.[1];
    const due = listDue(list, id ? byId.get(id) ?? null : null, now);
    if (!due) {
      result.kept++;
      continue;
    }
    if (result.deleted.length + result.failed.length >= limit) {
      result.more = true;
      continue;
    }
    if (!options.apply) {
      result.deleted.push({ id: list.id, name: list.name, ...due });
      continue;
    }
    try {
      await deleteContactList(list.id);
      if (id) await Broadcast.updateOne({ _id: new Types.ObjectId(id), brevoListId: list.id }, { $set: { brevoListDeletedAt: new Date() } });
      result.deleted.push({ id: list.id, name: list.name, ...due });
    } catch (error) {
      result.failed.push({
        id: list.id,
        name: list.name,
        error: error instanceof BrevoError || error instanceof Error ? error.message.slice(0, 200) : String(error),
      });
    }
  }
  if (options.apply && result.deleted.length) {
    console.info(`[brevo] deleted ${result.deleted.length} old broadcast lists (${result.failed.length} failed)`);
  }
  return result;
}
