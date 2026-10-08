// src/lib/economy/settings.ts
// Admin overrides (/admin/economy) on top of the defaults in each module's
// code. Read through a short in-memory cache so every earn and purchase
// doesn't hit the database; a change is picked up within CACHE_MS on every
// server instance (immediately on the one that saved it).
import { getEconomySettingModel, type IEconomySetting } from "@/lib/models/economySettingModel";
import { getModule, getProduct, getSource, moduleOf, type EarnSourceDef, type ProductDef, type Rewards } from "./registry";
import { CURRENCY_CODES } from "./currencies";

const CACHE_MS = 30_000;

/** Default for the overall daily AC cap from task-style earnings (setting "core"). */
export const DEFAULT_DAILY_AC_CAP = 150;

let cache: { at: number; byId: Map<string, IEconomySetting> } | null = null;

export async function economySettings(): Promise<Map<string, IEconomySetting>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.byId;
  const Setting = await getEconomySettingModel();
  const rows = await Setting.find({}).lean<IEconomySetting[]>();
  cache = { at: Date.now(), byId: new Map(rows.map((r) => [r._id, r])) };
  return cache.byId;
}

export function clearEconomySettingsCache(): void {
  cache = null;
}

/** A module or anything in it is off when its own switch or its module's is. */
export async function isEnabled(id: string): Promise<boolean> {
  const settings = await economySettings();
  const mod = moduleOf(id);
  if (!getModule(mod)) return false;
  if (settings.get(mod)?.enabled === false) return false;
  return settings.get(id)?.enabled !== false;
}

export interface EffectiveSource extends EarnSourceDef {
  module: string;
  enabled: boolean;
}

export async function effectiveSource(id: string): Promise<EffectiveSource | null> {
  const def = getSource(id);
  if (!def) return null;
  const s = (await economySettings()).get(id);
  const rewards: Rewards = { ...def.rewards };
  for (const c of CURRENCY_CODES) {
    const v = s?.rewards?.[c];
    if (typeof v === "number") rewards[c] = v;
  }
  return {
    ...def,
    rewards,
    dailyCap: typeof s?.dailyCap === "number" ? s.dailyCap : def.dailyCap,
    enabled: await isEnabled(id),
  };
}

export interface EffectiveProduct extends ProductDef {
  module: string;
  enabled: boolean;
}

export async function effectiveProduct(id: string): Promise<EffectiveProduct | null> {
  const def = getProduct(id);
  if (!def) return null;
  const s = (await economySettings()).get(id);
  return { ...def, price: typeof s?.price === "number" ? s.price : def.price, enabled: await isEnabled(id) };
}

export async function dailyAcCap(): Promise<number> {
  const cap = (await economySettings()).get("core")?.dailyCap;
  return typeof cap === "number" ? cap : DEFAULT_DAILY_AC_CAP;
}
