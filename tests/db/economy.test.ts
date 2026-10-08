// The credits economy core (lib/economy): the double-entry ledger, earning
// with caps and multipliers, reversals, the generic shop, admin overrides,
// rebuilding wallets and the account purge. A module registered only here
// shows a new module plugs in without touching the core.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => void Promise.resolve().then(fn),
}));

import { EconomyError, balancesOf, post, reverse } from "@/lib/economy/ledger";
import { earn } from "@/lib/economy/earn";
import { buy, listShop } from "@/lib/economy/shop";
import { registerModule, unregisterModule } from "@/lib/economy/registry";
import { saveEconomySetting } from "@/lib/economy/admin";
import { clearEconomySettingsCache } from "@/lib/economy/settings";
import { adjust, anonymiseLedger, recomputeWallets, walletHistory, walletSummary } from "@/lib/economy/wallet";
import { FORMER_MEMBER_ACCOUNT, SYSTEM_ACCOUNTS, userAccount } from "@/lib/economy/currencies";
import { getLedgerEntryModel, type ILedgerEntry } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import { getEconomySettingModel } from "@/lib/models/economySettingModel";

const delivered: { userId: string; color: string }[] = [];
const seen: ILedgerEntry[] = [];

beforeAll(() => {
  registerModule({
    id: "test",
    title: "Test module",
    description: "Only exists in this test file.",
    sources: [
      { id: "test.task", title: "Did a test task", rewards: { AC: 10, XP: 15 }, dailyCap: 25, capped: true, streakBoost: true, countsForBoards: true },
      { id: "test.bonus", title: "A bonus", rewards: { AC: 50 } },
    ],
    products: [
      {
        id: "test.thing",
        kind: "cosmetic",
        title: "A thing",
        description: "Comes in red or blue.",
        price: 30,
        parse: (body) => {
          if (body.color !== "red" && body.color !== "blue") throw new EconomyError("invalid", "Pick red or blue.");
          return { color: body.color as string };
        },
        fulfil: async ({ userId, ctx }) => {
          delivered.push({ userId, color: (ctx as { color: string }).color });
          return { color: (ctx as { color: string }).color };
        },
      },
      {
        id: "test.broken",
        kind: "cosmetic",
        title: "Never arrives",
        description: "Delivery always fails.",
        price: 5,
        fulfil: async () => {
          throw new Error("warehouse on fire");
        },
      },
      { id: "test.daily", kind: "streak", title: "Once a day", description: "", price: 1, perDay: 1, minLevel: 2, fulfil: async () => "ok" },
    ],
    listeners: [(e) => void seen.push(e)],
  });
});

let ada: string;
let bola: string;
const AC = (n: number, from: string, to: string) => [
  { account: from, currency: "AC", amount: -n },
  { account: to, currency: "AC", amount: n },
];
let keys = 0;
const key = () => `test-key-${Date.now()}-${keys++}`;

beforeEach(async () => {
  const [LedgerEntry, Wallet, Setting] = await Promise.all([getLedgerEntryModel(), getWalletModel(), getEconomySettingModel()]);
  await Promise.all([LedgerEntry.init(), Wallet.init()]);
  await Promise.all([LedgerEntry.deleteMany({}), Wallet.deleteMany({}), Setting.deleteMany({})]);
  clearEconomySettingsCache();
  delivered.length = 0;
  seen.length = 0;
  ada = String(new Types.ObjectId());
  bola = String(new Types.ObjectId());
});

const give = (userId: string, n: number) =>
  post({ kind: "adjust", module: "core", source: "core.adjust", sourceKey: key(), postings: AC(n, SYSTEM_ACCOUNTS.mint, userAccount(userId)) });

describe("post", () => {
  it("moves credits and keeps wallets in step", async () => {
    await give(ada, 100);
    await post({ kind: "transfer", module: "test", source: "test.tip", sourceKey: key(), postings: AC(40, userAccount(ada), userAccount(bola)) });
    expect((await balancesOf(userAccount(ada))).AC).toBe(60);
    expect((await balancesOf(userAccount(bola))).AC).toBe(40);
    expect((await balancesOf(SYSTEM_ACCOUNTS.mint)).AC).toBe(-100);
  });

  it("refuses entries that don't balance or aren't whole", async () => {
    const bad = (postings: { account: string; currency: string; amount: number }[]) =>
      post({ kind: "adjust", module: "core", source: "x", sourceKey: key(), postings });
    await expect(bad([{ account: userAccount(ada), currency: "AC", amount: 5 }])).rejects.toThrow(EconomyError);
    await expect(bad([...AC(5, SYSTEM_ACCOUNTS.mint, userAccount(ada)), { account: userAccount(ada), currency: "AC", amount: 1 }])).rejects.toThrow(/add up/);
    await expect(bad(AC(1.5, SYSTEM_ACCOUNTS.mint, userAccount(ada)))).rejects.toThrow(/whole/);
    await expect(bad(AC(5, SYSTEM_ACCOUNTS.mint, "not an account"))).rejects.toThrow(/Bad account/);
    await expect(bad([{ account: SYSTEM_ACCOUNTS.mint, currency: "GOLD", amount: -1 }, { account: userAccount(ada), currency: "GOLD", amount: 1 }])).rejects.toThrow(/currency/);
    expect(await (await getLedgerEntryModel()).countDocuments()).toBe(0);
  });

  it("never moves XP between people or to other accounts", async () => {
    const xp = (from: string, to: string) => [
      { account: from, currency: "XP", amount: -5 },
      { account: to, currency: "XP", amount: 5 },
    ];
    await expect(post({ kind: "transfer", module: "test", source: "x", sourceKey: key(), postings: xp(userAccount(ada), userAccount(bola)), allowNegative: true })).rejects.toThrow(/person to another/);
    await expect(post({ kind: "transfer", module: "test", source: "x", sourceKey: key(), postings: xp(SYSTEM_ACCOUNTS.mint, SYSTEM_ACCOUNTS.treasury) })).rejects.toThrow(/only moves/);
  });

  it("refuses to take anyone but the mint below zero, atomically", async () => {
    await give(ada, 10);
    await expect(
      post({ kind: "spend", module: "test", source: "x", sourceKey: key(), postings: AC(11, userAccount(ada), SYSTEM_ACCOUNTS.burn) }),
    ).rejects.toMatchObject({ code: "insufficient" });
    expect((await balancesOf(userAccount(ada))).AC).toBe(10);
    expect((await balancesOf(SYSTEM_ACCOUNTS.burn)).AC).toBe(0);
  });

  it("posts a sourceKey once, even in parallel", async () => {
    const input = { kind: "adjust" as const, module: "core", source: "core.adjust", sourceKey: "once", postings: AC(7, SYSTEM_ACCOUNTS.mint, userAccount(ada)) };
    const results = await Promise.all([post(input), post(input), post(input)]);
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect((await balancesOf(userAccount(ada))).AC).toBe(7);
  });

  it("lets parallel spends through only while the balance lasts", async () => {
    await give(ada, 50);
    const spend = () =>
      post({ kind: "spend", module: "test", source: "x", sourceKey: key(), postings: AC(20, userAccount(ada), SYSTEM_ACCOUNTS.burn) }).then(
        () => "ok",
        (e: EconomyError) => e.code,
      );
    const outcomes = await Promise.all([spend(), spend(), spend(), spend()]);
    expect(outcomes.filter((o) => o === "ok")).toHaveLength(2);
    expect((await balancesOf(userAccount(ada))).AC).toBe(10);
  });

  it("tells the module's listeners", async () => {
    await give(ada, 3);
    await new Promise((r) => setTimeout(r, 20));
    expect(seen.map((e) => e.postings.find((p) => p.amount > 0)?.account)).toContain(userAccount(ada));
  });
});

describe("earn", () => {
  it("pays the source's rewards once per key", async () => {
    expect(await earn(ada, "test.task", "task:1")).toMatchObject({ status: "paid", AC: 10, XP: 15 });
    expect(await earn(ada, "test.task", "task:1")).toMatchObject({ status: "duplicate", AC: 10, XP: 15 });
    expect(await balancesOf(userAccount(ada))).toEqual({ AC: 10, XP: 15 });
  });

  it("applies the source's daily cap to AC, never to XP", async () => {
    await earn(ada, "test.task", "a");
    await earn(ada, "test.task", "b");
    expect(await earn(ada, "test.task", "c")).toMatchObject({ status: "capped", AC: 5, XP: 15, cappedAC: 5 });
    expect(await earn(ada, "test.task", "d")).toMatchObject({ status: "capped", AC: 0, XP: 15 });
    expect(await balancesOf(userAccount(ada))).toEqual({ AC: 25, XP: 60 });
    // Someone else has their own cap
    expect((await earn(bola, "test.task", "e")).AC).toBe(10);
  });

  it("applies the overall daily cap, set by admins", async () => {
    await saveEconomySetting({ id: "core", dailyCap: 12 }, { userId: ada, upid: "admin" });
    expect((await earn(ada, "test.task", "a")).AC).toBe(10);
    expect((await earn(ada, "test.task", "b")).AC).toBe(2);
    // Not a capped source: unaffected
    expect((await earn(ada, "test.bonus", "c")).AC).toBe(50);
  });

  it("boosts only sources with streakBoost, up to the maximum", async () => {
    expect(await earn(ada, "test.task", "a", { multiplier: 1.5 })).toMatchObject({ AC: 15, XP: 23 });
    expect(await earn(bola, "test.task", "b", { multiplier: 9 })).toMatchObject({ AC: 20, XP: 30 });
    expect((await earn(ada, "test.bonus", "c", { multiplier: 2 })).AC).toBe(50);
  });

  it("follows admin overrides and switches", async () => {
    await saveEconomySetting({ id: "test.task", rewards: { AC: 4 } }, { userId: ada, upid: "admin" });
    expect(await earn(ada, "test.task", "a")).toMatchObject({ AC: 4, XP: 15 });
    await saveEconomySetting({ id: "test.task", enabled: false }, { userId: ada, upid: "admin" });
    expect((await earn(ada, "test.task", "b")).status).toBe("disabled");
    await saveEconomySetting({ id: "test.task", reset: true }, { userId: ada, upid: "admin" });
    await saveEconomySetting({ id: "test", enabled: false }, { userId: ada, upid: "admin" });
    expect((await earn(ada, "test.bonus", "c")).status).toBe("disabled");
  });

  it("refuses unknown sources", async () => {
    await expect(earn(ada, "test.nope", "x")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("reverse", () => {
  it("takes credits back, even below zero, once", async () => {
    await earn(ada, "test.bonus", "bonus:1");
    await post({ kind: "spend", module: "test", source: "x", sourceKey: key(), postings: AC(30, userAccount(ada), SYSTEM_ACCOUNTS.burn) });
    const first = await reverse("bonus:1", { note: "Overturned" });
    expect(first?.duplicate).toBe(false);
    expect((await balancesOf(userAccount(ada))).AC).toBe(-30);
    expect((await reverse("bonus:1"))?.duplicate).toBe(true);
    expect(await reverse("never-posted")).toBeNull();
    // Below zero: can't spend
    await expect(
      post({ kind: "spend", module: "test", source: "x", sourceKey: key(), postings: AC(1, userAccount(ada), SYSTEM_ACCOUNTS.burn) }),
    ).rejects.toMatchObject({ code: "insufficient" });
    const history = await walletHistory(ada);
    expect(history.items[0]).toMatchObject({ kind: "reverse", AC: -50, title: "Taken back: A bonus" });
    expect(history.items.find((i) => i.kind === "earn")?.reversed).toBe(true);
  });
});

describe("shop", () => {
  it("lists every registered product with why it can't be bought yet", async () => {
    await give(ada, 20);
    const items = await listShop(ada);
    expect(items.map((i) => i.id).sort()).toEqual(["test.broken", "test.daily", "test.thing"]);
    expect(items.find((i) => i.id === "test.thing")?.blocked).toBe("You need 10 more AC.");
    expect(items.find((i) => i.id === "test.daily")?.blocked).toBe("Unlocks at level 2.");
    expect(items.find((i) => i.id === "test.broken")?.blocked).toBeUndefined();
  });

  it("buys, delivers and answers a retry without charging twice", async () => {
    await give(ada, 100);
    const k = key();
    const first = await buy(ada, "test.thing", { color: "red" }, k);
    expect(first).toMatchObject({ price: 30, result: { color: "red" }, duplicate: false });
    const again = await buy(ada, "test.thing", { color: "red" }, k);
    expect(again).toMatchObject({ entryId: first.entryId, duplicate: true, result: { color: "red" } });
    expect(delivered).toEqual([{ userId: ada, color: "red" }]);
    expect((await balancesOf(userAccount(ada))).AC).toBe(70);
    expect((await balancesOf(SYSTEM_ACCOUNTS.burn)).AC).toBe(30);
  });

  it("charges once when the same purchase arrives in parallel", async () => {
    await give(ada, 100);
    const k = key();
    await Promise.allSettled([1, 2, 3].map(() => buy(ada, "test.thing", { color: "blue" }, k)));
    expect((await balancesOf(userAccount(ada))).AC).toBe(70);
  });

  it("refuses bad requests before charging", async () => {
    await give(ada, 100);
    await expect(buy(ada, "test.thing", { color: "green" }, key())).rejects.toThrow(/red or blue/);
    await expect(buy(ada, "test.thing", { color: "red" }, "short")).rejects.toThrow(/Idempotency-Key/);
    await expect(buy(ada, "test.nothing", {}, key())).rejects.toMatchObject({ code: "not_found" });
    await expect(buy(bola, "test.thing", { color: "red" }, key())).rejects.toMatchObject({ code: "insufficient" });
    await expect(buy(ada, "test.daily", {}, key())).rejects.toMatchObject({ code: "level" });
    expect((await balancesOf(userAccount(ada))).AC).toBe(100);
  });

  it("refunds when delivery fails", async () => {
    await give(ada, 10);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(buy(ada, "test.broken", {}, key())).rejects.toThrow(/weren't charged/);
    spy.mockRestore();
    expect((await balancesOf(userAccount(ada))).AC).toBe(10);
  });

  it("keeps to per-day limits and level gates", async () => {
    await give(ada, 10);
    await post({ kind: "adjust", module: "core", source: "core.adjust", sourceKey: key(), postings: [
      { account: SYSTEM_ACCOUNTS.mint, currency: "XP", amount: -100 },
      { account: userAccount(ada), currency: "XP", amount: 100 },
    ] });
    await buy(ada, "test.daily", {}, key());
    await expect(buy(ada, "test.daily", {}, key())).rejects.toMatchObject({ code: "limit" });
  });

  it("uses admin prices and hides switched-off items", async () => {
    await give(ada, 100);
    await saveEconomySetting({ id: "test.thing", price: 12 }, { userId: ada, upid: "admin" });
    expect((await listShop(ada)).find((i) => i.id === "test.thing")?.price).toBe(12);
    expect((await buy(ada, "test.thing", { color: "red" }, key())).price).toBe(12);
    await saveEconomySetting({ id: "test.thing", enabled: false }, { userId: ada, upid: "admin" });
    expect((await listShop(ada)).some((i) => i.id === "test.thing")).toBe(false);
    await expect(buy(ada, "test.thing", { color: "red" }, key())).rejects.toMatchObject({ code: "disabled" });
  });
});

describe("admin settings", () => {
  it("validates overrides", async () => {
    const actor = { userId: ada, upid: "admin" };
    await expect(saveEconomySetting({ id: "nope" }, actor)).rejects.toMatchObject({ code: "not_found" });
    await expect(saveEconomySetting({ id: "test.thing", price: 0 }, actor)).rejects.toThrow(/price/);
    await expect(saveEconomySetting({ id: "test.thing", rewards: { AC: 1 } }, actor)).rejects.toThrow(/Only earn sources/);
    await expect(saveEconomySetting({ id: "test.task", price: 5 }, actor)).rejects.toThrow(/Only products/);
    await expect(saveEconomySetting({ id: "test.task", rewards: { GOLD: 1 } }, actor)).rejects.toThrow(/Unknown currency/);
    await expect(saveEconomySetting({ id: "core", enabled: false }, actor)).rejects.toThrow(/core/);
    const saved = await saveEconomySetting({ id: "test.task", rewards: { AC: 3, XP: null }, dailyCap: 9 }, actor);
    expect(saved).toMatchObject({ rewards: { AC: 3 }, dailyCap: 9, updatedByUpid: "admin" });
  });
});

describe("wallets, adjustments and the purge", () => {
  it("summarises a wallet with level and today's earnings", async () => {
    await earn(ada, "test.task", "a");
    const w = await walletSummary(ada);
    expect(w).toMatchObject({ AC: 10, XP: 15, level: { level: 1, title: "Rookie Scout" }, today: { earnedAC: 10, capAC: 150 } });
  });

  it("adjusts with a note, both ways", async () => {
    await adjust({ account: userAccount(ada), currency: "AC", amount: 25, note: "Contest prize", actorId: bola });
    await adjust({ account: userAccount(ada), currency: "AC", amount: -40, note: "Farming", actorId: bola });
    expect((await balancesOf(userAccount(ada))).AC).toBe(-15);
    await expect(adjust({ account: userAccount(ada), currency: "AC", amount: 5, note: "", actorId: bola })).rejects.toThrow(/why/);
    await expect(adjust({ account: userAccount(ada), currency: "AC", amount: 0, note: "zero", actorId: bola })).rejects.toThrow(/whole/);
    const item = (await walletHistory(ada)).items[0];
    expect(item).toMatchObject({ kind: "adjust", AC: -40, note: "Farming", title: "Adjustment by the UniArchive team" });
  });

  it("rebuilds wallets from the ledger", async () => {
    await earn(ada, "test.task", "a");
    const Wallet = await getWalletModel();
    await Wallet.updateOne({ account: userAccount(ada), currency: "AC" }, { $set: { balance: 999 } });
    const diffs = await recomputeWallets(false);
    expect(diffs).toEqual([{ account: userAccount(ada), currency: "AC", wallet: 999, ledger: 10 }]);
    expect((await balancesOf(userAccount(ada))).AC).toBe(999);
    await recomputeWallets(true);
    expect((await balancesOf(userAccount(ada))).AC).toBe(10);
    expect(await recomputeWallets(false)).toEqual([]);
  });

  it("moves a deleted person's postings to user:former, totals intact", async () => {
    await earn(ada, "test.task", "a");
    await give(ada, 5);
    await post({ kind: "transfer", module: "test", source: "x", sourceKey: key(), postings: AC(3, userAccount(ada), userAccount(bola)) });
    expect(await anonymiseLedger(ada)).toBe(3);
    const LedgerEntry = await getLedgerEntryModel();
    expect(await LedgerEntry.countDocuments({ accounts: userAccount(ada) })).toBe(0);
    expect(await balancesOf(userAccount(ada))).toEqual({ AC: 0, XP: 0 });
    expect(await balancesOf(FORMER_MEMBER_ACCOUNT)).toEqual({ AC: 12, XP: 15 });
    expect((await balancesOf(userAccount(bola))).AC).toBe(3);
    expect(await recomputeWallets(false)).toEqual([]);
  });
});

describe("plug and play", () => {
  it("drops a module's products and sources when it is unregistered", async () => {
    unregisterModule("test");
    expect(await listShop(ada)).toEqual([]);
    await expect(earn(ada, "test.task", "x")).rejects.toMatchObject({ code: "not_found" });
  });
});
