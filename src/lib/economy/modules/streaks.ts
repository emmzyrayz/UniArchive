// src/lib/economy/modules/streaks.ts
// Streak protection for sale (lib/scouts/streaks.ts uses it): a freeze
// covers a missed day automatically, a repair covers one that's just been
// missed. Admins can change prices at /admin/economy.
import { Types } from "mongoose";
import { EconomyError } from "../ledger";
import type { EconomyModule, ProductDef } from "../registry";
import { MAX_FREEZES, getScoutStreakModel, type IScoutStreak } from "@/lib/models/scoutStreakModel";
import { REPAIR_EVERY_DAYS, scoutStreak } from "@/lib/scouts/streaks";

const oid = (id: string) => new Types.ObjectId(id);

async function heldFreezes(userId: string): Promise<number> {
  const state = await (await getScoutStreakModel()).findOne({ userId: oid(userId) }).select("freezes").lean<Pick<IScoutStreak, "freezes">>();
  return state?.freezes ?? 0;
}

const freeze: ProductDef = {
  id: "streaks.freeze",
  kind: "streak",
  title: "Streak freeze",
  description: `Covers a day you miss, automatically, so your streak carries on. Hold up to ${MAX_FREEZES}.`,
  price: 40,
  detail: async (userId) => `You hold ${await heldFreezes(userId)} of ${MAX_FREEZES}.`,
  available: async (userId) =>
    (await heldFreezes(userId)) >= MAX_FREEZES ? { ok: false, reason: `You already hold ${MAX_FREEZES}.` } : { ok: true },
  fulfil: async ({ userId }) => {
    const Streak = await getScoutStreakModel();
    try {
      const updated = await Streak.findOneAndUpdate(
        { userId: oid(userId), freezes: { $lt: MAX_FREEZES } },
        { $inc: { freezes: 1 }, $set: { updatedAt: new Date() }, $setOnInsert: { covered: [] } },
        { upsert: true, returnDocument: "after" },
      ).lean<IScoutStreak>();
      return { freezes: updated?.freezes ?? 1 };
    } catch (error) {
      // The upsert hit the unique userId: they already hold the most (refunded by buy())
      if ((error as { code?: number }).code === 11000) throw new EconomyError("limit", `You already hold ${MAX_FREEZES}.`);
      throw error;
    }
  },
};

async function repairState(userId: string) {
  const s = await scoutStreak(userId);
  const recent = s.lastRepairAt && Date.now() - Date.parse(s.lastRepairAt) < REPAIR_EVERY_DAYS * 86_400_000;
  return { s, recent };
}

const repair: ProductDef = {
  id: "streaks.repair",
  kind: "streak",
  title: "Streak repair",
  description: `Missed a day without a freeze? Restores a streak of 3 days or more that broke in the last 48 hours. Once every ${REPAIR_EVERY_DAYS} days.`,
  price: 100,
  detail: async (userId) => {
    const { s, recent } = await repairState(userId);
    if (recent) return `Next repair from ${new Date(Date.parse(s.lastRepairAt!) + REPAIR_EVERY_DAYS * 86_400_000).toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" })}.`;
    return s.repair ? `Restores your streak to ${s.repair.restoresTo} days.` : undefined;
  },
  available: async (userId) => {
    const { s, recent } = await repairState(userId);
    if (recent) return { ok: false, reason: `You can repair once every ${REPAIR_EVERY_DAYS} days.` };
    if (!s.repair) return { ok: false, reason: "Nothing to repair: your streak hasn't just broken." };
    return { ok: true };
  },
  fulfil: async ({ userId }) => {
    const { s } = await repairState(userId);
    if (!s.repair) throw new EconomyError("limit", "Nothing to repair any more.");
    const Streak = await getScoutStreakModel();
    const now = new Date();
    const since = new Date(now.getTime() - REPAIR_EVERY_DAYS * 86_400_000);
    try {
      const updated = await Streak.updateOne(
        {
          userId: oid(userId),
          "covered.day": { $ne: s.repair.day },
          covered: { $not: { $elemMatch: { kind: "repair", at: { $gte: since } } } },
        },
        { $push: { covered: { day: s.repair.day, kind: "repair", at: now } }, $set: { updatedAt: now }, $setOnInsert: { freezes: 0 } },
        { upsert: true },
      );
      if (updated.modifiedCount + updated.upsertedCount !== 1) throw new EconomyError("limit", "This streak was already repaired.");
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new EconomyError("limit", `You can repair once every ${REPAIR_EVERY_DAYS} days.`);
      throw error;
    }
    return { day: s.repair.day, streak: s.repair.restoresTo };
  },
};

export const streaksModule: EconomyModule = {
  id: "streaks",
  title: "Streak protection",
  description: "Freezes and repairs that keep Scout streaks going.",
  products: [freeze, repair],
};
