// Streak freezes and repairs (lib/economy/modules/streaks.ts and the
// freeze use in lib/scouts/streaks.ts), bought through the generic shop.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => void Promise.resolve().then(fn),
}));
vi.mock("@/lib/redis", () => ({ redis: { set: async () => "OK", get: async () => null, del: async () => 0 } }));

import { buy, listShop } from "@/lib/economy/shop";
import { balancesOf, post } from "@/lib/economy/ledger";
import { SYSTEM_ACCOUNTS, userAccount } from "@/lib/economy/currencies";
import { scoutStreak } from "@/lib/scouts/streaks";
import { runScoutsDaily } from "@/lib/scouts/daily";
import { getScoutStreakModel } from "@/lib/models/scoutStreakModel";
import { readingDay } from "@/lib/readingStats";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getLedgerEntryModel } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import { getNotificationModel } from "@/lib/models/notificationModel";
import { getEconomySettingModel } from "@/lib/models/economySettingModel";
import { clearEconomySettingsCache } from "@/lib/economy/settings";

let keys = 0;
const key = () => `streak-test-${Date.now()}-${keys++}`;
const ac = async (id: string) => (await balancesOf(userAccount(id))).AC;

async function give(userId: string, amount: number) {
  await post({
    kind: "adjust", module: "core", source: "core.adjust", sourceKey: key(),
    postings: [
      { account: SYSTEM_ACCOUNTS.mint, currency: "AC", amount: -amount },
      { account: userAccount(userId), currency: "AC", amount },
    ],
  });
}

/** Three answers on each Lagos day `back` days before today. */
async function activeOn(userId: string, backs: number[]) {
  const docs = backs.flatMap((back) =>
    [0, 1, 2].map((i) => {
      // Noon in Lagos on that Lagos day (safe at any hour, even 23:30 UTC)
      const at = new Date(`${readingDay(new Date(Date.now() - back * 86_400_000))}T11:0${i}:00Z`);
      return {
        userId: new Types.ObjectId(userId), task: "readable", subjectId: new Types.ObjectId(), materialId: new Types.ObjectId(),
        answer: "readable", status: "pending", counted: true, multiplier: 1, createdAt: at,
      };
    }),
  );
  if (docs.length) await (await getScoutAnswerModel()).collection.insertMany(docs);
}

let me: string;
beforeEach(async () => {
  const models = await Promise.all([
    getScoutStreakModel(), getScoutAnswerModel(), getLedgerEntryModel(), getWalletModel(), getNotificationModel(), getEconomySettingModel(),
  ]);
  await Promise.all(models.map((m) => (m as unknown as { init: () => Promise<unknown> }).init()));
  await Promise.all(models.map((m) => (m as unknown as { deleteMany: (f: object) => Promise<unknown> }).deleteMany({})));
  clearEconomySettingsCache();
  me = String(new Types.ObjectId());
});

describe("streak freezes", () => {
  it("buys up to two, the third refused before charging", async () => {
    await give(me, 200);
    expect((await buy(me, "streaks.freeze", {}, key())).result).toEqual({ freezes: 1 });
    expect((await buy(me, "streaks.freeze", {}, key())).result).toEqual({ freezes: 2 });
    await expect(buy(me, "streaks.freeze", {}, key())).rejects.toThrow(/already hold 2/);
    expect(await ac(me)).toBe(120);
    const item = (await listShop(me)).find((i) => i.id === "streaks.freeze");
    expect(item).toMatchObject({ detail: "You hold 2 of 2.", blocked: "You already hold 2." });
  });

  it("never goes over two when purchases race, and refunds the loser", async () => {
    await give(me, 200);
    await buy(me, "streaks.freeze", {}, key());
    await Promise.allSettled([1, 2, 3].map(() => buy(me, "streaks.freeze", {}, key())));
    const state = await (await getScoutStreakModel()).findOne({ userId: new Types.ObjectId(me) }).lean();
    expect(state?.freezes).toBe(2);
    expect(await ac(me)).toBe(200 - 2 * 40);
  });

  it("covers a missed yesterday automatically, once, and says so", async () => {
    await give(me, 40);
    await buy(me, "streaks.freeze", {}, key());
    await activeOn(me, [2, 3, 4]);
    const first = await scoutStreak(me);
    expect(first).toMatchObject({ current: 4, freezes: 0, todayDone: false });
    const again = await scoutStreak(me);
    expect(again).toMatchObject({ current: 4, freezes: 0 });
    const notes = await (await getNotificationModel()).find({ type: "streak_saved" }).lean();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("A streak freeze saved your 4-day streak");
  });

  it("keeps freezes when the gap is longer than they cover", async () => {
    await give(me, 40);
    await buy(me, "streaks.freeze", {}, key());
    await activeOn(me, [3, 4]);
    expect(await scoutStreak(me)).toMatchObject({ current: 0, freezes: 1 });
  });

  it("the daily job applies freezes for people who didn't come back", async () => {
    await give(me, 40);
    await buy(me, "streaks.freeze", {}, key());
    await activeOn(me, [2, 3, 4]);
    await runScoutsDaily();
    expect(await (await getNotificationModel()).countDocuments({ type: "streak_saved" })).toBe(1);
    // Saved to 4 days, today not done: they're reminded too
    expect(await (await getNotificationModel()).countDocuments({ type: "streak_risk" })).toBe(1);
  });
});

describe("streak repair", () => {
  it("restores a streak that broke yesterday, once every 30 days", async () => {
    await give(me, 300);
    await activeOn(me, [2, 3, 4]);
    const shop = (await listShop(me)).find((i) => i.id === "streaks.repair");
    expect(shop).toMatchObject({ detail: "Restores your streak to 4 days.", blocked: undefined });
    expect((await buy(me, "streaks.repair", {}, key())).result).toMatchObject({ streak: 4 });
    expect(await scoutStreak(me)).toMatchObject({ current: 4, repair: null });
    expect(await ac(me)).toBe(200);
    await expect(buy(me, "streaks.repair", {}, key())).rejects.toMatchObject({ code: "limit" });
    expect(await ac(me)).toBe(200);
  });

  it("isn't offered when there's nothing to repair", async () => {
    await give(me, 300);
    await activeOn(me, [1, 2, 3]);
    expect((await listShop(me)).find((i) => i.id === "streaks.repair")?.blocked).toMatch(/Nothing to repair/);
    await expect(buy(me, "streaks.repair", {}, key())).rejects.toMatchObject({ code: "limit" });
    expect(await ac(me)).toBe(300);
  });

  it("asks for enough credits", async () => {
    await give(me, 50);
    await activeOn(me, [2, 3, 4]);
    await expect(buy(me, "streaks.repair", {}, key())).rejects.toMatchObject({ code: "insufficient" });
  });
});
