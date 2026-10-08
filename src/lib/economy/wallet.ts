// src/lib/economy/wallet.ts
// What the economy looks like to one person (wallet, history) and to staff
// (adjustments, totals, rebuilding the wallets, the account purge).
import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { getLedgerEntryModel, type ILedgerEntry } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import { CURRENCIES, FORMER_MEMBER_ACCOUNT, SYSTEM_ACCOUNTS, userAccount, type Currency } from "./currencies";
import { EconomyError, balancesOf, deltaFor, historyOf, post } from "./ledger";
import { levelFromXp, type LevelInfo } from "./levels";
import { getProduct, getSource, getModule } from "./registry";
import { dailyAcCap } from "./settings";
import { earnedToday } from "./shop";
import { loadEconomyModules } from "./modules";

export interface WalletSummary {
  AC: number;
  XP: number;
  level: LevelInfo;
  today: { earnedAC: number; capAC: number };
}

export async function walletSummary(userId: string): Promise<WalletSummary> {
  const [balances, earned, cap] = await Promise.all([balancesOf(userAccount(userId)), earnedToday(userId), dailyAcCap()]);
  return { AC: balances.AC, XP: balances.XP, level: levelFromXp(balances.XP), today: { earnedAC: earned, capAC: cap } };
}

export interface HistoryItem {
  id: string;
  kind: ILedgerEntry["kind"];
  title: string;
  AC: number;
  XP: number;
  note?: string;
  reversed: boolean;
  createdAt: string;
}

/** A label for an entry: its source or product title, else a plain fallback. */
export function entryTitle(entry: Pick<ILedgerEntry, "kind" | "source" | "module">): string {
  loadEconomyModules();
  const base = getSource(entry.source)?.title ?? getProduct(entry.source)?.title;
  if (entry.kind === "reverse") return `Taken back: ${base ?? entry.source}`;
  if (entry.kind === "adjust") return "Adjustment by the UniArchive team";
  if (base) return base;
  return getModule(entry.module)?.title ?? entry.source;
}

export function toHistoryItem(entry: ILedgerEntry, account: string): HistoryItem {
  const d = deltaFor(entry, account);
  return {
    id: String(entry._id),
    kind: entry.kind,
    title: entryTitle(entry),
    AC: d.AC ?? 0,
    XP: d.XP ?? 0,
    note: entry.note,
    reversed: !!entry.reversedBy,
    createdAt: new Date(entry.createdAt).toISOString(),
  };
}

export async function walletHistory(userId: string, before?: string) {
  const account = userAccount(userId);
  const { entries, nextCursor } = await historyOf(account, before);
  return { items: entries.map((e) => toHistoryItem(e, account)), nextCursor };
}

/**
 * A staff correction: positive gives to `account` from the mint, negative
 * takes back to the mint (may leave it below zero). Always needs a note.
 */
export async function adjust(input: {
  account: string;
  currency: Currency;
  amount: number;
  note: string;
  actorId: string;
}) {
  if (!(input.currency in CURRENCIES)) throw new EconomyError("invalid", "Unknown currency.");
  if (!Number.isSafeInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 100_000) {
    throw new EconomyError("invalid", "The amount must be a whole number between -100,000 and 100,000, not 0.");
  }
  const note = input.note.trim();
  if (note.length < 3) throw new EconomyError("invalid", "Say why (a short note is kept with the adjustment).");
  return post({
    kind: "adjust",
    module: "core",
    source: input.account === SYSTEM_ACCOUNTS.treasury ? "core.treasury" : "core.adjust",
    sourceKey: `adjust:${randomUUID()}`,
    postings: [
      { account: SYSTEM_ACCOUNTS.mint, currency: input.currency, amount: -input.amount },
      { account: input.account, currency: input.currency, amount: input.amount },
    ],
    allowNegative: true,
    actorId: input.actorId,
    note: note.slice(0, 500),
  });
}

/** Totals for the admin page: what the system accounts hold. */
export async function systemTotals(): Promise<Record<string, Record<Currency, number>>> {
  const out: Record<string, Record<Currency, number>> = {};
  for (const [name, account] of Object.entries(SYSTEM_ACCOUNTS)) out[name] = await balancesOf(account);
  return out;
}

/**
 * Rebuilds every wallet from the ledger. With apply false, only reports the
 * wallets that differ. Returns the differences found.
 */
export async function recomputeWallets(apply: boolean) {
  const LedgerEntry = await getLedgerEntryModel();
  const Wallet = await getWalletModel();
  const sums = await LedgerEntry.aggregate<{ _id: { account: string; currency: string }; balance: number }>([
    { $unwind: "$postings" },
    { $group: { _id: { account: "$postings.account", currency: "$postings.currency" }, balance: { $sum: "$postings.amount" } } },
  ]);
  const want = new Map(sums.map((s) => [`${s._id.account}|${s._id.currency}`, s]));
  const have = await Wallet.find({}).lean();
  const diffs: { account: string; currency: string; wallet: number; ledger: number }[] = [];
  for (const w of have) {
    const s = want.get(`${w.account}|${w.currency}`);
    if ((s?.balance ?? 0) !== w.balance) diffs.push({ account: w.account, currency: w.currency, wallet: w.balance, ledger: s?.balance ?? 0 });
    want.delete(`${w.account}|${w.currency}`);
  }
  for (const s of want.values()) {
    if (s.balance !== 0) diffs.push({ account: s._id.account, currency: s._id.currency, wallet: 0, ledger: s.balance });
  }
  if (apply) {
    for (const d of diffs) {
      await Wallet.updateOne({ account: d.account, currency: d.currency }, { $set: { balance: d.ledger, updatedAt: new Date() } }, { upsert: true });
    }
  }
  return diffs;
}

/**
 * The account purge: the person's postings move to "user:former" so every
 * total still adds up, and their wallets are folded into its wallets.
 */
export async function anonymiseLedger(userId: string | Types.ObjectId): Promise<number> {
  const account = userAccount(userId);
  const LedgerEntry = await getLedgerEntryModel();
  const Wallet = await getWalletModel();
  const result = await LedgerEntry.updateMany(
    { accounts: account },
    {
      $set: { "postings.$[p].account": FORMER_MEMBER_ACCOUNT, "accounts.$[a]": FORMER_MEMBER_ACCOUNT },
    },
    { arrayFilters: [{ "p.account": account }, { a: account }] },
  );
  const wallets = await Wallet.find({ account }).lean();
  for (const w of wallets) {
    if (w.balance !== 0) {
      await Wallet.updateOne({ account: FORMER_MEMBER_ACCOUNT, currency: w.currency }, { $inc: { balance: w.balance } }, { upsert: true });
    }
  }
  await Wallet.deleteMany({ account });
  return result.modifiedCount;
}
