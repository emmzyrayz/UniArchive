// src/lib/economy/registry.ts
// The plug-in points of the credits economy. A module (Scouts, bounties,
// streaks, the hub...) is one manifest: the earn sources it pays from, the
// products it sells, and the ledger listeners it needs. Register it once in
// lib/economy/modules/index.ts; the wallet, shop, history and admin pages
// pick it up without changes.
import type { ILedgerEntry } from "@/lib/models/ledgerEntryModel";
import type { Currency } from "./currencies";
import { onLedgerEvent, type LedgerListener } from "./events";

export type Rewards = Partial<Record<Currency, number>>;

export interface EarnSourceDef {
  id: string; // "<module>.<name>"
  title: string; // shown in history: "Checked a PDF is readable"
  rewards: Rewards; // defaults; admins may override
  /** Most AC one person can earn from this source in a Lagos day. */
  dailyCap?: number;
  /** XP from it counts toward leaderboards. */
  countsForBoards?: boolean;
  /** The streak multiplier applies. */
  streakBoost?: boolean;
  /** Counts toward the overall daily AC cap (task-style earnings do). */
  capped?: boolean;
}

export interface BuyContext<C> {
  userId: string;
  ctx: C;
  entry: ILedgerEntry;
}

export interface ProductDef<C = unknown> {
  id: string; // "<module>.<name>"
  kind: string; // the shop card used: "cosmetic", "streak", "storage" ...
  title: string;
  description: string;
  price: number; // AC; admins may override
  minLevel?: number;
  /** Most purchases per person per Lagos day. */
  perDay?: number;
  /** Reads the buyer's choices from the request body; throw EconomyError to refuse. */
  parse?: (body: Record<string, unknown>) => C;
  /** Whether this person can buy it now (owned already, limit reached...). */
  available?: (userId: string, ctx: C) => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Where the credits go (default: burned). */
  destination?: (userId: string, ctx: C) => string | Promise<string>;
  /** Delivers it. If this throws, the payment is reversed. */
  fulfil: (args: BuyContext<C>) => Promise<unknown>;
}

export interface EconomyModule {
  id: string;
  title: string;
  description: string;
  sources?: EarnSourceDef[];
  products?: ProductDef[];
  listeners?: LedgerListener[];
}

const modules = new Map<string, EconomyModule>();
const sources = new Map<string, EarnSourceDef & { module: string }>();
const products = new Map<string, ProductDef & { module: string }>();
const unsubscribe = new Map<string, (() => void)[]>();

const ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)?$/;

/** Adds a module. Registering the same id again replaces it (hot reload, tests). */
export function registerModule(m: EconomyModule): void {
  if (!ID_RE.test(m.id) || m.id.includes(".")) throw new Error(`Bad economy module id "${m.id}"`);
  unregisterModule(m.id);
  for (const s of m.sources ?? []) {
    if (!ID_RE.test(s.id) || !s.id.startsWith(`${m.id}.`)) throw new Error(`Earn source "${s.id}" must be "${m.id}.<name>"`);
    if (sources.has(s.id)) throw new Error(`Earn source "${s.id}" is registered twice`);
    sources.set(s.id, { ...s, module: m.id });
  }
  for (const p of m.products ?? []) {
    if (!ID_RE.test(p.id) || !p.id.startsWith(`${m.id}.`)) throw new Error(`Product "${p.id}" must be "${m.id}.<name>"`);
    if (products.has(p.id)) throw new Error(`Product "${p.id}" is registered twice`);
    products.set(p.id, { ...(p as ProductDef), module: m.id });
  }
  unsubscribe.set(m.id, (m.listeners ?? []).map((l) => onLedgerEvent(l)));
  modules.set(m.id, m);
}

export function unregisterModule(id: string): void {
  const m = modules.get(id);
  if (!m) return;
  for (const s of m.sources ?? []) sources.delete(s.id);
  for (const p of m.products ?? []) products.delete(p.id);
  for (const off of unsubscribe.get(id) ?? []) off();
  unsubscribe.delete(id);
  modules.delete(id);
}

export const getModule = (id: string) => modules.get(id);
export const getSource = (id: string) => sources.get(id);
export const getProduct = (id: string) => products.get(id);
export const listModules = () => [...modules.values()];
export const listSources = () => [...sources.values()];
export const listProducts = () => [...products.values()];

/** Module id of a source or product id ("scouts.readable" -> "scouts"). */
export const moduleOf = (id: string) => id.split(".")[0];

