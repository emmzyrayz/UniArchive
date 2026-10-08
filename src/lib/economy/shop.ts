// src/lib/economy/shop.ts
// The one way to buy anything with credits. Every product from every
// module goes through buy(): checks (enabled, level, daily limit, the
// product's own availability), the payment, then the product's fulfil().
// If fulfil() fails the payment is reversed, so nobody pays for nothing.
// The client sends an Idempotency-Key: a retried request returns the
// first purchase instead of charging twice.
import { SYSTEM_ACCOUNTS, userAccount } from "./currencies";
import { EconomyError, balancesOf, post, receivedOn, reverse } from "./ledger";
import { levelFromXp } from "./levels";
import { getProduct, listProducts } from "./registry";
import { effectiveProduct, type EffectiveProduct } from "./settings";
import { loadEconomyModules } from "./modules";
import { getLedgerEntryModel } from "@/lib/models/ledgerEntryModel";
import { readingDay } from "@/lib/readingStats";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;

export interface ShopItem {
  id: string;
  module: string;
  kind: string;
  title: string;
  description: string;
  price: number;
  minLevel?: number;
  /** Why this person can't buy it now, if they can't. */
  blocked?: string;
}

export interface BuyResult {
  entryId: string;
  price: number;
  result: unknown;
  duplicate: boolean;
}

async function purchasesToday(account: string, productId: string): Promise<number> {
  const LedgerEntry = await getLedgerEntryModel();
  return LedgerEntry.countDocuments({
    accounts: account,
    day: readingDay(),
    kind: "spend",
    source: productId,
    reversedBy: { $exists: false },
  });
}

async function blockedReason(p: EffectiveProduct, userId: string, balance: { AC: number; XP: number }): Promise<string | undefined> {
  if (!p.enabled) return "Not available right now.";
  if (p.minLevel && levelFromXp(balance.XP).level < p.minLevel) return `Unlocks at level ${p.minLevel}.`;
  if (p.perDay && (await purchasesToday(userAccount(userId), p.id)) >= p.perDay) {
    return p.perDay === 1 ? "You can get this once a day." : `You can get this ${p.perDay} times a day.`;
  }
  if (balance.AC < p.price) return `You need ${p.price - balance.AC} more AC.`;
  return undefined;
}

/** Every product, with the price after overrides and why this person can't buy it yet. */
export async function listShop(userId: string): Promise<ShopItem[]> {
  loadEconomyModules();
  const balance = await balancesOf(userAccount(userId));
  const items: ShopItem[] = [];
  for (const def of listProducts()) {
    const p = (await effectiveProduct(def.id))!;
    if (!p.enabled) continue;
    items.push({
      id: p.id,
      module: p.module,
      kind: p.kind,
      title: p.title,
      description: p.description,
      price: p.price,
      minLevel: p.minLevel,
      blocked: await blockedReason(p, userId, balance),
    });
  }
  return items;
}

export async function buy(
  userId: string,
  productId: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<BuyResult> {
  loadEconomyModules();
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) throw new EconomyError("invalid", "A valid Idempotency-Key is required.");
  if (!getProduct(productId)) throw new EconomyError("not_found", "That item doesn't exist.");
  const account = userAccount(userId);
  const sourceKey = `buy:${productId}:${userId}:${idempotencyKey}`;

  // A retry of a purchase that went through: answer as before, charge nothing
  const LedgerEntry = await getLedgerEntryModel();
  const previous = await LedgerEntry.findOne({ sourceKey }).lean();
  if (previous) {
    return { entryId: String(previous._id), price: -(previous.postings.find((x) => x.account === account)?.amount ?? 0), result: previous.meta?.result ?? null, duplicate: true };
  }

  const p = (await effectiveProduct(productId))!;
  const balance = await balancesOf(account);
  const ctx = p.parse ? p.parse(body ?? {}) : undefined;
  const blocked = await blockedReason(p, userId, balance);
  if (blocked) {
    const code = !p.enabled ? "disabled" : blocked.startsWith("Unlocks") ? "level" : blocked.startsWith("You need") ? "insufficient" : "limit";
    throw new EconomyError(code, blocked);
  }
  if (p.available) {
    const ok = await p.available(userId, ctx);
    if (!ok.ok) throw new EconomyError("limit", ok.reason);
  }
  if (!Number.isSafeInteger(p.price) || p.price < 1) throw new EconomyError("invalid", "This item has a bad price.");

  const destination = p.destination ? await p.destination(userId, ctx) : SYSTEM_ACCOUNTS.burn;
  const { entry, duplicate } = await post({
    kind: "spend",
    module: p.module,
    source: p.id,
    sourceKey,
    postings: [
      { account, currency: "AC", amount: -p.price },
      { account: destination, currency: "AC", amount: p.price },
    ],
    meta: { productKind: p.kind },
  });
  if (duplicate) return { entryId: String(entry._id), price: p.price, result: entry.meta?.result ?? null, duplicate: true };

  try {
    const result = await p.fulfil({ userId, ctx, entry });
    // Remember what was delivered, so a retry can answer the same way
    await LedgerEntry.updateOne({ _id: entry._id }, { $set: { "meta.result": result ?? null } });
    return { entryId: String(entry._id), price: p.price, result: result ?? null, duplicate: false };
  } catch (error) {
    await reverse(sourceKey, { note: "Delivery failed; refunded." }).catch((e) =>
      console.error(`[economy] refund of ${sourceKey} failed:`, e),
    );
    if (error instanceof EconomyError) throw error;
    console.error(`[economy] ${productId} fulfil failed:`, error);
    throw new EconomyError("invalid", "Something went wrong delivering that. You weren't charged.", 500);
  }
}

/** AC a person got today from earn entries (for the wallet's "today" line). */
export const earnedToday = (userId: string) => receivedOn(userAccount(userId), readingDay(), "AC", { kind: "earn" });
