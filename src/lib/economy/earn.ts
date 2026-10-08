// src/lib/economy/earn.ts
// Paying someone from an earn source. Applies, in order: the source's
// rewards (or the ones the caller computed), the streak multiplier (for
// sources with streakBoost), then the caps: the source's own daily AC cap
// and the overall daily AC cap for task-style sources. XP is never capped.
// Caps are checked before the entry is written, so two payments landing
// in the same instant can overshoot a cap by one payment; that's accepted.
import { Types } from "mongoose";
import { readingDay } from "@/lib/readingStats";
import { SYSTEM_ACCOUNTS, userAccount, type Currency } from "./currencies";
import { EconomyError, post, receivedOn } from "./ledger";
import { getSource, listSources, type Rewards } from "./registry";
import { getLedgerEntryModel } from "@/lib/models/ledgerEntryModel";
import { dailyAcCap, effectiveSource } from "./settings";
import { loadEconomyModules } from "./modules";

export const MAX_MULTIPLIER = 2;

export type EarnStatus = "paid" | "duplicate" | "capped" | "disabled";

export interface EarnResult {
  status: EarnStatus;
  AC: number;
  XP: number;
  entryId?: string;
  /** AC held back by a cap. */
  cappedAC?: number;
}

export interface EarnOptions {
  /** Rewards worked out by the caller (e.g. a bounty's pool); else the source's. */
  rewards?: Rewards;
  /** Streak multiplier, 1 to MAX_MULTIPLIER; only used when the source has streakBoost. */
  multiplier?: number;
  /** Pay from this account instead of the mint (e.g. escrow:<bounty>); no caps then. */
  from?: string;
  meta?: Record<string, unknown>;
  at?: Date;
}

/** Applies a multiplier to rewards, rounding to whole credits. Pure. */
export function boosted(rewards: Rewards, multiplier = 1): Record<Currency, number> {
  const m = Math.min(MAX_MULTIPLIER, Math.max(1, Number.isFinite(multiplier) ? multiplier : 1));
  return { AC: Math.round((rewards.AC ?? 0) * m), XP: Math.round((rewards.XP ?? 0) * m) };
}

/** How much of `wanted` fits under each cap's remaining room. Pure. */
export function underCaps(wanted: number, rooms: (number | undefined)[]): number {
  let allowed = wanted;
  for (const room of rooms) if (typeof room === "number") allowed = Math.min(allowed, Math.max(0, room));
  return Math.max(0, allowed);
}

/**
 * Pays `userId` from `sourceId`. `sourceKey` makes it happen at most once
 * (e.g. "scouts.readable:<answerId>"). Never pays a disabled source.
 */
export async function earn(
  userId: string | Types.ObjectId,
  sourceId: string,
  sourceKey: string,
  opts: EarnOptions = {},
): Promise<EarnResult> {
  loadEconomyModules();
  if (!getSource(sourceId)) throw new EconomyError("not_found", `Unknown earn source ${sourceId}.`);
  const source = (await effectiveSource(sourceId))!;
  if (!source.enabled) return { status: "disabled", AC: 0, XP: 0 };

  const account = userAccount(userId);
  const from = opts.from ?? SYSTEM_ACCOUNTS.mint;
  const amounts = boosted(opts.rewards ?? source.rewards, source.streakBoost ? opts.multiplier : 1);

  let cappedAC = 0;
  if (from === SYSTEM_ACCOUNTS.mint && amounts.AC > 0) {
    const day = readingDay(opts.at ?? new Date());
    const rooms: (number | undefined)[] = [];
    if (typeof source.dailyCap === "number") {
      rooms.push(source.dailyCap - (await receivedOn(account, day, "AC", { kind: "earn", source: sourceId })));
    }
    if (source.capped) {
      // The overall cap counts every capped source's earnings today
      rooms.push((await dailyAcCap()) - (await cappedEarnedOn(account, day)));
    }
    const allowed = underCaps(amounts.AC, rooms);
    cappedAC = amounts.AC - allowed;
    amounts.AC = allowed;
  }

  const postings = (Object.entries(amounts) as [Currency, number][])
    .filter(([, n]) => n > 0)
    .flatMap(([currency, amount]) => [
      { account: from, currency, amount: -amount },
      { account, currency, amount },
    ]);
  if (postings.length === 0) return { status: cappedAC > 0 ? "capped" : "paid", AC: 0, XP: 0, cappedAC };

  const { entry, duplicate } = await post({
    kind: "earn",
    module: source.module,
    source: sourceId,
    sourceKey,
    postings,
    countsForBoards: !!source.countsForBoards,
    meta: { ...opts.meta, ...(cappedAC ? { cappedAC } : {}), ...(source.streakBoost && opts.multiplier && opts.multiplier > 1 ? { multiplier: opts.multiplier } : {}) },
    at: opts.at,
  });
  const got = (c: Currency) => entry.postings.filter((p) => p.account === account && p.currency === c).reduce((s, p) => s + p.amount, 0);
  return {
    status: duplicate ? "duplicate" : cappedAC > 0 ? "capped" : "paid",
    AC: got("AC"),
    XP: got("XP"),
    entryId: String(entry._id),
    cappedAC: cappedAC || undefined,
  };
}

/** AC earned today from sources that count toward the overall cap. */
async function cappedEarnedOn(account: string, day: string): Promise<number> {
  const capped = listSources().filter((s) => s.capped).map((s) => s.id);
  if (capped.length === 0) return 0;
  const LedgerEntry = await getLedgerEntryModel();
  const rows = await LedgerEntry.aggregate<{ total: number }>([
    { $match: { accounts: account, day, kind: "earn", source: { $in: capped } } },
    { $unwind: "$postings" },
    { $match: { "postings.account": account, "postings.currency": "AC", "postings.amount": { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$postings.amount" } } },
  ]);
  return rows[0]?.total ?? 0;
}
