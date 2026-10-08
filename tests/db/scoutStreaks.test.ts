// Scout streaks (lib/scouts/streaks.ts), the daily reminder job
// (lib/scouts/daily.ts), Scout badges, and the multiplier on Identify pay.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => void Promise.resolve().then(fn),
}));
vi.mock("@/lib/redis", () => ({ redis: { set: async () => "OK", get: async () => null, del: async () => 0 } }));

import { scoutStreak } from "@/lib/scouts/streaks";
import { runScoutsDaily } from "@/lib/scouts/daily";
import { checkAndAwardBadges } from "@/lib/badges";
import { settleSuggestions } from "@/lib/materialSuggestions";
import { balancesOf } from "@/lib/economy/ledger";
import { userAccount } from "@/lib/economy/currencies";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getMaterialSuggestionModel, type IMaterialSuggestion } from "@/lib/models/materialSuggestionModel";
import { getUserModel } from "@/lib/models/userModel";
import { getUserBadgeModel } from "@/lib/models/userBadgeModel";
import { getNotificationModel } from "@/lib/models/notificationModel";
import { getLedgerEntryModel } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import { getMaterialModel } from "@/lib/models/materialModel";

// 18:00 in Lagos, when the job runs
const NOW = new Date("2026-10-08T17:00:00Z");
const daysAgo = (n: number, hourUtc = 11) => {
  const d = new Date(NOW.getTime() - n * 86_400_000);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
};

const school = new Types.ObjectId();
let n = 0;
async function user(extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  n++;
  await (await getUserModel()).collection.insertOne({
    _id, upid: `s${n}`, uuid: `uuid-s${n}-${Date.now()}`, emailHash: `hash-s${n}-${Date.now()}`, username: `s${n}`,
    role: "student", createdAt: new Date("2027-06-01"), isSuspended: false, universityId: school, ...extra,
  });
  return _id;
}

/** `count` answers by `userId` on the day `back` days ago. */
async function activity(userId: Types.ObjectId, back: number, count: number, status = "pending") {
  await (await getScoutAnswerModel()).collection.insertMany(
    Array.from({ length: count }, (_, i) => ({
      userId, task: "readable", subjectId: new Types.ObjectId(), materialId: new Types.ObjectId(), answer: "readable",
      status, counted: true, multiplier: 1, createdAt: new Date(daysAgo(back).getTime() + i * 60_000),
    })),
  );
}

beforeEach(async () => {
  const models = await Promise.all([
    getScoutAnswerModel(), getMaterialSuggestionModel(), getUserModel(), getUserBadgeModel(), getNotificationModel(),
    getLedgerEntryModel(), getWalletModel(), getMaterialModel(),
  ]);
  await Promise.all(models.map((m) => (m as unknown as { init: () => Promise<unknown> }).init()));
  await Promise.all(models.map((m) => (m as unknown as { deleteMany: (f: object) => Promise<unknown> }).deleteMany({})));
});

describe("scoutStreak", () => {
  it("counts answers and suggestions per Lagos day", async () => {
    const me = await user();
    await activity(me, 1, 3);
    await activity(me, 2, 2);
    await (await getMaterialSuggestionModel()).collection.insertOne({
      materialId: new Types.ObjectId(), userId: me, userUpid: "x", fields: {}, fingerprint: "f", status: "pending", createdAt: daysAgo(2),
    });
    await activity(me, 0, 1);
    expect(await scoutStreak(me, NOW)).toMatchObject({ current: 2, today: 1, todayDone: false, multiplier: 1 });
  });

  it("uses the Lagos calendar: 23:30 UTC is already tomorrow there", async () => {
    const me = await user();
    // 23:30 UTC on the day before yesterday = 00:30 yesterday in Lagos
    const late = daysAgo(2, 23);
    late.setUTCMinutes(30);
    await (await getScoutAnswerModel()).collection.insertMany(
      [0, 1, 2].map((i) => ({
        userId: me, task: "readable", subjectId: new Types.ObjectId(), materialId: new Types.ObjectId(), answer: "readable",
        status: "pending", counted: true, multiplier: 1, createdAt: new Date(late.getTime() + i * 1000),
      })),
    );
    expect((await scoutStreak(me, NOW)).current).toBe(1);
  });
});

describe("the daily job", () => {
  it("reminds streaks of 3+ that aren't done today, once a day", async () => {
    const atRisk = await user();
    for (const back of [1, 2, 3]) await activity(atRisk, back, 3);
    await activity(atRisk, 0, 1);
    const safe = await user();
    for (const back of [0, 1, 2, 3]) await activity(safe, back, 3);
    const short = await user();
    for (const back of [1, 2]) await activity(short, back, 3);

    const first = await runScoutsDaily(NOW);
    expect(first).toMatchObject({ day: "2026-10-08", checked: 3, reminded: 1, timedOut: false });
    const sent = await (await getNotificationModel()).find({}).lean();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ userId: atRisk, type: "streak_risk", link: "/scouts", title: "Your 3-day Scout streak ends at midnight" });
    expect(sent[0].body).toBe("Do 2 more Scout tasks today to keep it and your ×1.1 bonus.");
    expect((await runScoutsDaily(NOW)).reminded).toBe(0);
  });
});

describe("Scout badges", () => {
  it("First Scout and the streak badges", async () => {
    const me = await user();
    for (let back = 1; back <= 7; back++) await activity(me, back, 3, back === 1 ? "confirmed" : "pending");
    const awarded = [
      ...(await checkAndAwardBadges(String(me), "scout_confirmed")),
      ...(await checkAndAwardBadges(String(me), "scout_streak")),
    ];
    expect(awarded.sort()).toEqual(["campus_pioneer", "first_scout", "streak_7"]);
  });

  it("Campus Pioneer goes to the first ten of a school only", async () => {
    const badges = await getUserBadgeModel();
    for (let i = 0; i < 10; i++) {
      const id = await user();
      await badges.collection.insertOne({ userId: id, userUpid: "x", badgeId: "campus_pioneer", awardedAt: new Date(), seen: true });
    }
    const late = await user();
    await activity(late, 0, 1, "confirmed");
    expect(await checkAndAwardBadges(String(late), "scout_confirmed")).toEqual(["first_scout"]);
    const elsewhere = await user({ universityId: new Types.ObjectId() });
    await activity(elsewhere, 0, 1, "confirmed");
    expect((await checkAndAwardBadges(String(elsewhere), "scout_confirmed")).sort()).toEqual(["campus_pioneer", "first_scout"]);
  });
});

describe("the streak multiplier on Identify", () => {
  it("pays an accepted suggestion with the multiplier it was sent with", async () => {
    const me = await user();
    const materialId = new Types.ObjectId();
    await (await getMaterialModel()).collection.insertOne({ _id: materialId, title: "MTH 101" });
    const row = {
      _id: new Types.ObjectId(), materialId, userId: me, userUpid: "x", fields: {}, fingerprint: "f", status: "pending", multiplier: 1.5,
    };
    await (await getMaterialSuggestionModel()).collection.insertOne(row);
    await settleSuggestions(materialId, row as unknown as IMaterialSuggestion);
    // 15 AC x 1.5 = 22.5, rounded; 20 XP x 1.5 = 30
    expect(await balancesOf(userAccount(me))).toEqual({ AC: 23, XP: 30 });
  });
});
