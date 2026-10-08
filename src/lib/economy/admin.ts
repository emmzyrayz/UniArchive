// src/lib/economy/admin.ts
// The admin view of the economy (/admin/economy): every module with its
// sources and products, defaults beside overrides, plus validation of the
// overrides admins save.
import { Types } from "mongoose";
import { getEconomySettingModel, type IEconomySetting } from "@/lib/models/economySettingModel";
import { getLedgerEntryModel, type ILedgerEntry } from "@/lib/models/ledgerEntryModel";
import { getUserModel } from "@/lib/models/userModel";
import { CURRENCY_CODES, SYSTEM_ACCOUNTS, userIdOf, type Currency } from "./currencies";
import { EconomyError } from "./ledger";
import { getModule, getProduct, getSource, listModules } from "./registry";
import {
  DEFAULT_DAILY_AC_CAP,
  clearEconomySettingsCache,
  economySettings,
  effectiveProduct,
  effectiveSource,
  isEnabled,
} from "./settings";
import { systemTotals } from "./wallet";
import { loadEconomyModules } from "./modules";

export const LIMITS = { price: 100_000, reward: 10_000, dailyCap: 100_000 };

export async function economyOverview() {
  loadEconomyModules();
  const settings = await economySettings();
  const modules = [];
  for (const m of listModules()) {
    const sources = [];
    for (const s of m.sources ?? []) {
      const e = (await effectiveSource(s.id))!;
      sources.push({
        id: s.id,
        title: s.title,
        defaults: { rewards: s.rewards, dailyCap: s.dailyCap ?? null },
        rewards: e.rewards,
        dailyCap: e.dailyCap ?? null,
        enabled: e.enabled,
        overridden: settings.has(s.id),
        countsForBoards: !!s.countsForBoards,
        streakBoost: !!s.streakBoost,
        capped: !!s.capped,
      });
    }
    const products = [];
    for (const p of m.products ?? []) {
      const e = (await effectiveProduct(p.id))!;
      products.push({
        id: p.id,
        title: p.title,
        kind: p.kind,
        description: p.description,
        defaultPrice: p.price,
        price: e.price,
        minLevel: p.minLevel ?? null,
        perDay: p.perDay ?? null,
        enabled: e.enabled,
        overridden: settings.has(p.id),
      });
    }
    modules.push({
      id: m.id,
      title: m.title,
      description: m.description,
      enabled: await isEnabled(m.id),
      sources,
      products,
    });
  }

  const LedgerEntry = await getLedgerEntryModel();
  const recent = await LedgerEntry.find({ kind: "adjust" }).sort({ _id: -1 }).limit(20).lean<ILedgerEntry[]>();
  const people = new Set<string>();
  for (const a of recent) {
    if (a.actorId) people.add(String(a.actorId));
    for (const p of a.postings) {
      const id = userIdOf(p.account);
      if (id) people.add(id);
    }
  }
  const users = await (await getUserModel())
    .find({ _id: { $in: [...people].filter((id) => Types.ObjectId.isValid(id)) } })
    .select("upid")
    .lean<{ _id: Types.ObjectId; upid: string }[]>();
  const upidOf = new Map(users.map((u) => [String(u._id), u.upid]));
  const label = (account: string) => {
    if (account === SYSTEM_ACCOUNTS.treasury) return "Treasury";
    const id = userIdOf(account);
    return id ? `@${upidOf.get(id) ?? "unknown"}` : account;
  };

  return {
    dailyAcCap: { default: DEFAULT_DAILY_AC_CAP, value: settings.get("core")?.dailyCap ?? DEFAULT_DAILY_AC_CAP },
    totals: await systemTotals(),
    modules,
    adjustments: recent.map((a) => {
      const target = a.postings.find((p) => p.account !== SYSTEM_ACCOUNTS.mint);
      return {
        id: String(a._id),
        target: label(target?.account ?? ""),
        currency: target?.currency ?? "",
        amount: target?.amount ?? 0,
        note: a.note ?? "",
        by: a.actorId ? `@${upidOf.get(String(a.actorId)) ?? "unknown"}` : "",
        createdAt: new Date(a.createdAt).toISOString(),
      };
    }),
  };
}

export type EconomyOverview = Awaited<ReturnType<typeof economyOverview>>;

function wholeIn(v: unknown, min: number, max: number, what: string): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min || v > max) {
    throw new EconomyError("invalid", `${what} must be a whole number from ${min} to ${max.toLocaleString("en")}.`);
  }
  return v;
}

/**
 * Saves an override for a module, source, product or "core" (the daily AC
 * cap). A field set to null goes back to the code's default; `reset: true`
 * removes every override for the id.
 */
export async function saveEconomySetting(
  body: Record<string, unknown>,
  actor: { userId: string; upid: string },
): Promise<IEconomySetting | null> {
  loadEconomyModules();
  const id = typeof body.id === "string" ? body.id : "";
  const isCore = id === "core";
  const source = getSource(id);
  const product = getProduct(id);
  const isModule = !id.includes(".") && !!getModule(id);
  if (!source && !product && !isModule) throw new EconomyError("not_found", "Nothing in the economy has that id.");

  const Setting = await getEconomySettingModel();
  if (body.reset === true) {
    await Setting.deleteOne({ _id: id });
    clearEconomySettingsCache();
    return null;
  }

  const set: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy: new Types.ObjectId(actor.userId),
    updatedByUpid: actor.upid,
  };
  const unset: Record<string, ""> = {};
  const field = (key: string, value: unknown, check: (v: unknown) => unknown) => {
    if (value === undefined) return;
    if (value === null) unset[key] = "";
    else set[key] = check(value);
  };

  if (body.enabled !== undefined) {
    if (isCore) throw new EconomyError("invalid", "The core can't be switched off.");
    field("enabled", body.enabled, (v) => {
      if (typeof v !== "boolean") throw new EconomyError("invalid", "enabled must be true or false.");
      return v;
    });
  }
  if (body.price !== undefined) {
    if (!product) throw new EconomyError("invalid", "Only products have a price.");
    field("price", body.price, (v) => wholeIn(v, 1, LIMITS.price, "The price"));
  }
  if (body.dailyCap !== undefined) {
    if (!source && !isCore) throw new EconomyError("invalid", "Only earn sources and the core have a daily cap.");
    field("dailyCap", body.dailyCap, (v) => wholeIn(v, 0, LIMITS.dailyCap, "The daily cap"));
  }
  if (body.rewards !== undefined) {
    if (!source) throw new EconomyError("invalid", "Only earn sources have rewards.");
    if (!body.rewards || typeof body.rewards !== "object") throw new EconomyError("invalid", "rewards must be an object.");
    for (const [c, v] of Object.entries(body.rewards as Record<string, unknown>)) {
      if (!CURRENCY_CODES.includes(c as Currency)) throw new EconomyError("invalid", `Unknown currency ${c}.`);
      field(`rewards.${c}`, v, (x) => wholeIn(x, 0, LIMITS.reward, `The ${c} reward`));
    }
  }

  const saved = await Setting.findOneAndUpdate(
    { _id: id },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { upsert: true, returnDocument: "after" },
  ).lean<IEconomySetting>();
  clearEconomySettingsCache();
  return saved;
}
