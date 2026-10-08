// src/lib/economy/ledger.ts
// The core of the credits economy: post() writes one balanced entry and
// updates the wallets it touches in a single MongoDB transaction, so the
// ledger and the balances can't disagree. Nothing here knows about Scouts,
// bounties or the hub: modules call post() (through earn(), buy() and
// their own helpers) and listen to what it writes (events.ts).
//
// Rules post() enforces:
// - postings add up to zero per currency; amounts are whole numbers
// - XP only moves between the mint and a person (it's earned, never traded)
// - no account but the mint goes below zero, unless the entry allows it
//   (a reversal may leave someone negative; they can't spend until it's back)
// - a sourceKey is used once: posting it again returns the first entry
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { readingDay } from "@/lib/readingStats";
import { getLedgerEntryModel, type ILedgerEntry, type IPosting, type LedgerKind } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import {
  CURRENCIES,
  SYSTEM_ACCOUNTS,
  isUserAccount,
  isValidAccount,
  mayGoNegative,
  type Currency,
} from "./currencies";
import { emitLedgerEvent } from "./events";

export type EconomyErrorCode = "invalid" | "insufficient" | "disabled" | "limit" | "not_found" | "level";

/** A refusal people can act on; routes turn it into a 4xx with the message. */
export class EconomyError extends Error {
  constructor(
    public code: EconomyErrorCode,
    message: string,
    public status = code === "not_found" ? 404 : code === "insufficient" || code === "limit" || code === "level" ? 409 : 400,
  ) {
    super(message);
    this.name = "EconomyError";
  }
}

export interface PostInput {
  kind: LedgerKind;
  module: string;
  source: string;
  sourceKey: string;
  postings: IPosting[];
  countsForBoards?: boolean;
  actorId?: string | Types.ObjectId;
  note?: string;
  meta?: Record<string, unknown>;
  /** Let accounts go below zero (reversals, staff corrections). */
  allowNegative?: boolean;
  /** The entry this one reverses (set by reverse()). */
  reverses?: Types.ObjectId;
  at?: Date;
}

export interface PostResult {
  entry: ILedgerEntry;
  /** The sourceKey had been posted before; nothing changed. */
  duplicate: boolean;
}

/** Net change per account and currency, checked for balance and shape. */
export function netPostings(postings: IPosting[]): Map<string, { account: string; currency: Currency; amount: number }> {
  if (!Array.isArray(postings) || postings.length < 2) throw new EconomyError("invalid", "An entry needs at least two postings.");
  const net = new Map<string, { account: string; currency: Currency; amount: number }>();
  const sums = new Map<string, number>();
  for (const p of postings) {
    if (!(p.currency in CURRENCIES)) throw new EconomyError("invalid", `Unknown currency ${p.currency}.`);
    if (!isValidAccount(p.account)) throw new EconomyError("invalid", `Bad account ${p.account}.`);
    if (!Number.isSafeInteger(p.amount) || p.amount === 0) throw new EconomyError("invalid", "Amounts must be whole, non-zero numbers.");
    if (!CURRENCIES[p.currency as Currency].transferable && p.account !== SYSTEM_ACCOUNTS.mint && !isUserAccount(p.account)) {
      throw new EconomyError("invalid", `${p.currency} only moves between the mint and a person.`);
    }
    const key = `${p.account}|${p.currency}`;
    const prev = net.get(key);
    net.set(key, { account: p.account, currency: p.currency as Currency, amount: (prev?.amount ?? 0) + p.amount });
    sums.set(p.currency, (sums.get(p.currency) ?? 0) + p.amount);
  }
  for (const [currency, sum] of sums) {
    if (sum !== 0) throw new EconomyError("invalid", `${currency} postings add up to ${sum}, not 0.`);
  }
  // XP between two people would be a transfer in disguise
  for (const currency of sums.keys()) {
    if (CURRENCIES[currency as Currency].transferable) continue;
    const people = [...net.values()].filter((n) => n.currency === currency && n.amount !== 0 && isUserAccount(n.account));
    if (people.some((a) => a.amount > 0) && people.some((a) => a.amount < 0)) {
      throw new EconomyError("invalid", `${currency} can't move from one person to another.`);
    }
  }
  return net;
}

const accountsOf = (postings: IPosting[]) => [...new Set(postings.map((p) => p.account))];

/** Writes one entry and its balance changes atomically. Idempotent on sourceKey. */
export async function post(input: PostInput): Promise<PostResult> {
  if (!input.sourceKey || input.sourceKey.length > 200) throw new EconomyError("invalid", "A sourceKey is required.");
  const net = netPostings(input.postings);
  const LedgerEntry = await getLedgerEntryModel();
  const Wallet = await getWalletModel();

  const existing = await LedgerEntry.findOne({ sourceKey: input.sourceKey }).lean<ILedgerEntry>();
  if (existing) return { entry: existing, duplicate: true };

  const at = input.at ?? new Date();
  const doc = {
    kind: input.kind,
    module: input.module,
    source: input.source,
    sourceKey: input.sourceKey,
    accounts: accountsOf(input.postings),
    day: readingDay(at),
    postings: input.postings.map(({ account, currency, amount }) => ({ account, currency, amount })),
    countsForBoards: !!input.countsForBoards,
    reverses: input.reverses,
    actorId: input.actorId ? new Types.ObjectId(String(input.actorId)) : undefined,
    note: input.note,
    meta: input.meta,
    createdAt: at,
  };

  const conn = await connectDB();
  const session = await conn.startSession();
  let created: ILedgerEntry | null = null;
  try {
    await session.withTransaction(async () => {
      // Credits first, then debits, in a fixed order (fewer write conflicts)
      const changes = [...net.values()].filter((n) => n.amount !== 0).sort((a, b) => a.account.localeCompare(b.account));
      for (const n of changes) {
        if (n.amount < 0 && !mayGoNegative(n.account) && !input.allowNegative) {
          const updated = await Wallet.findOneAndUpdate(
            { account: n.account, currency: n.currency, balance: { $gte: -n.amount } },
            { $inc: { balance: n.amount }, $set: { updatedAt: at } },
            { session },
          );
          if (!updated) {
            throw new EconomyError(
              "insufficient",
              isUserAccount(n.account) ? `Not enough ${CURRENCIES[n.currency].short}.` : `${n.account} has too little ${n.currency}.`,
            );
          }
        } else {
          await Wallet.updateOne(
            { account: n.account, currency: n.currency },
            { $inc: { balance: n.amount }, $set: { updatedAt: at } },
            { upsert: true, session },
          );
        }
      }
      const [entry] = await LedgerEntry.create([doc], { session });
      if (input.reverses) {
        const marked = await LedgerEntry.updateOne(
          { _id: input.reverses, reversedBy: { $exists: false } },
          { $set: { reversedBy: entry._id } },
          { session },
        );
        if (marked.modifiedCount !== 1) throw new EconomyError("invalid", "That entry was already reversed.");
      }
      created = entry.toObject() as ILedgerEntry;
    });
  } catch (error) {
    // Posted meanwhile by a parallel call with the same key
    if ((error as { code?: number }).code === 11000) {
      const winner = await LedgerEntry.findOne({ sourceKey: input.sourceKey }).lean<ILedgerEntry>();
      if (winner) return { entry: winner, duplicate: true };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  emitLedgerEvent(created!);
  return { entry: created!, duplicate: false };
}

/**
 * Undoes an entry with a new, opposite one ("reverse:<sourceKey>"). The
 * people involved may go below zero (they earned it, then it was taken
 * back). Returns null when there's nothing to reverse.
 */
export async function reverse(
  sourceKey: string,
  opts: { note?: string; actorId?: string | Types.ObjectId; meta?: Record<string, unknown> } = {},
): Promise<PostResult | null> {
  const LedgerEntry = await getLedgerEntryModel();
  const original = await LedgerEntry.findOne({ sourceKey }).lean<ILedgerEntry>();
  if (!original) return null;
  if (original.reversedBy) {
    const done = await LedgerEntry.findById(original.reversedBy).lean<ILedgerEntry>();
    return done ? { entry: done, duplicate: true } : null;
  }
  if (original.kind === "reverse") throw new EconomyError("invalid", "A reversal can't be reversed.");
  return post({
    kind: "reverse",
    module: original.module,
    source: original.source,
    sourceKey: `reverse:${sourceKey}`,
    postings: original.postings.map((p) => ({ account: p.account, currency: p.currency, amount: -p.amount })),
    countsForBoards: original.countsForBoards,
    allowNegative: true,
    reverses: original._id,
    note: opts.note,
    actorId: opts.actorId,
    meta: opts.meta,
  });
}

/** Balances of one account, every currency (0 when it has none). */
export async function balancesOf(account: string): Promise<Record<Currency, number>> {
  const Wallet = await getWalletModel();
  const rows = await Wallet.find({ account }).select("currency balance").lean();
  const out = Object.fromEntries(Object.keys(CURRENCIES).map((c) => [c, 0])) as Record<Currency, number>;
  for (const r of rows) if (r.currency in out) out[r.currency as Currency] = r.balance;
  return out;
}

/** An account's entries, newest first; `before` is the last id seen. */
export async function historyOf(account: string, before?: string, limit = 30): Promise<{ entries: ILedgerEntry[]; nextCursor: string | null }> {
  const LedgerEntry = await getLedgerEntryModel();
  const filter: Record<string, unknown> = { accounts: account };
  if (before && Types.ObjectId.isValid(before)) filter._id = { $lt: new Types.ObjectId(before) };
  const rows = await LedgerEntry.find(filter).sort({ _id: -1 }).limit(limit + 1).lean<ILedgerEntry[]>();
  const entries = rows.slice(0, limit);
  return { entries, nextCursor: rows.length > limit ? String(entries[entries.length - 1]._id) : null };
}

/** What an entry did to one account: { AC: +15, XP: +20 }. */
export function deltaFor(entry: Pick<ILedgerEntry, "postings">, account: string): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {};
  for (const p of entry.postings) {
    if (p.account === account) out[p.currency as Currency] = (out[p.currency as Currency] ?? 0) + p.amount;
  }
  return out;
}

/** Sum of positive `currency` postings to `account` from entries of `kind` on `day`. */
export async function receivedOn(
  account: string,
  day: string,
  currency: Currency,
  filter: { kind?: LedgerKind; source?: string } = {},
): Promise<number> {
  const LedgerEntry = await getLedgerEntryModel();
  const rows = await LedgerEntry.aggregate<{ total: number }>([
    { $match: { accounts: account, day, ...(filter.kind ? { kind: filter.kind } : {}), ...(filter.source ? { source: filter.source } : {}) } },
    { $unwind: "$postings" },
    { $match: { "postings.account": account, "postings.currency": currency, "postings.amount": { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$postings.amount" } } },
  ]);
  return rows[0]?.total ?? 0;
}
