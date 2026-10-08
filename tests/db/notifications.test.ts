// The notification centre (lib/notifications.ts) and the events that send
// notifications (settling Help identify suggestions).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// after() needs a request; here it just runs the work, collected so tests can wait for it
const pending: Promise<unknown>[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    pending.push(Promise.resolve().then(fn));
  },
}));
// Badge checks touch Redis only for the catch-up throttle
vi.mock("@/lib/redis", () => ({ redis: { set: async () => "OK", get: async () => null, del: async () => 0 } }));
const settle = async () => {
  while (pending.length) await Promise.all(pending.splice(0));
};

import {
  listNotifications,
  markNotificationsRead,
  notify,
  notifyAfter,
  unreadNotificationCount,
} from "@/lib/notifications";
import { getNotificationModel, NOTIFICATION_TTL_DAYS } from "@/lib/models/notificationModel";
import { settleSuggestions } from "@/lib/materialSuggestions";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel, type IMaterialSuggestion } from "@/lib/models/materialSuggestionModel";

const ada = String(new Types.ObjectId());
const bola = String(new Types.ObjectId());

let Notification: Awaited<ReturnType<typeof getNotificationModel>>;
beforeEach(async () => {
  Notification = await getNotificationModel();
  await Notification.init();
  await Notification.deleteMany({});
});

describe("notify", () => {
  it("saves a notification and counts it unread", async () => {
    expect(await notify(ada, { type: "badge_earned", title: "You earned a badge", link: "/profile" })).toBe(true);
    expect(await unreadNotificationCount(ada)).toBe(1);
    expect(await unreadNotificationCount(bola)).toBe(0);
    const { notifications } = await listNotifications(ada);
    expect(notifications[0]).toMatchObject({ type: "badge_earned", icon: "🏅", link: "/profile", read: false });
  });

  it("sends a dedupeKey once per user", async () => {
    const input = { type: "badge_earned" as const, title: "x", dedupeKey: "badge:pdf_detective" };
    expect(await notify(ada, input)).toBe(true);
    expect(await notify(ada, input)).toBe(false);
    expect(await notify(bola, input)).toBe(true);
    expect(await Notification.countDocuments()).toBe(3 - 1);
  });

  it("drops links that leave the site and never throws", async () => {
    await notify(ada, { type: "badge_earned", title: "a", link: "https://evil.example" });
    await notify(ada, { type: "badge_earned", title: "b", link: "//evil.example/x" });
    await notify(ada, { type: "badge_earned", title: "c", link: "javascript:alert(1)" });
    const rows = await Notification.find({ userId: ada }).lean();
    expect(rows.map((r) => r.link)).toEqual([undefined, undefined, undefined]);
    // A bad user id or a bad type is logged, not thrown
    await expect(notify("not-an-id", { type: "badge_earned", title: "x" })).resolves.toBe(false);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notify(ada, { type: "nope" as never, title: "x" })).resolves.toBe(false);
    spy.mockRestore();
  });

  it("clips long text", async () => {
    await notify(ada, { type: "badge_earned", title: "t".repeat(300), body: "b".repeat(900) });
    const row = await Notification.findOne({ userId: ada }).lean();
    expect(row!.title).toHaveLength(200);
    expect(row!.body).toHaveLength(500);
  });

  it("expires after the TTL", async () => {
    const indexes = await Notification.collection.indexes();
    const ttl = indexes.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.key).toEqual({ createdAt: 1 });
    expect(ttl?.expireAfterSeconds).toBe(NOTIFICATION_TTL_DAYS * 86_400);
  });

  it("notifyAfter sends once the work runs", async () => {
    notifyAfter(ada, { type: "badge_earned", title: "later" });
    await settle();
    expect(await unreadNotificationCount(ada)).toBe(1);
  });
});

describe("listing and reading", () => {
  it("pages newest first with a cursor", async () => {
    for (let i = 0; i < 25; i++) await notify(ada, { type: "badge_earned", title: `n${i}` });
    const first = await listNotifications(ada);
    expect(first.notifications).toHaveLength(20);
    expect(first.notifications[0].title).toBe("n24");
    expect(first.nextCursor).not.toBeNull();
    const second = await listNotifications(ada, first.nextCursor!);
    expect(second.notifications.map((n) => n.title)).toEqual(["n4", "n3", "n2", "n1", "n0"]);
    expect(second.nextCursor).toBeNull();
  });

  it("marks some or all read, only the owner's", async () => {
    await notify(ada, { type: "badge_earned", title: "1" });
    await notify(ada, { type: "badge_earned", title: "2" });
    await notify(bola, { type: "badge_earned", title: "3" });
    const { notifications } = await listNotifications(ada);
    const bolaRow = await Notification.findOne({ userId: bola }).lean();

    // Someone else's id does nothing
    expect(await markNotificationsRead(ada, [String(bolaRow!._id), "junk"])).toBe(0);
    expect(await markNotificationsRead(ada, [notifications[0].id])).toBe(1);
    expect(await unreadNotificationCount(ada)).toBe(1);
    expect(await markNotificationsRead(ada, "all")).toBe(1);
    expect(await unreadNotificationCount(ada)).toBe(0);
    expect(await unreadNotificationCount(bola)).toBe(1);
  });
});

describe("Help identify suggestions", () => {
  it("tells the people who were right, and the others what it turned out to be", async () => {
    const Material = await getMaterialModel();
    const Suggestion = await getMaterialSuggestionModel();
    await Promise.all([Material.init(), Suggestion.init()]);
    const materialId = new Types.ObjectId();
    await Material.collection.insertOne({ _id: materialId, title: "MTH 101 Past Questions 2023" });
    const carl = new Types.ObjectId();
    const rows = [
      { userId: new Types.ObjectId(ada), fingerprint: "exams|mth101|unn|100" },
      { userId: new Types.ObjectId(bola), fingerprint: "exams|mth101|unn|100" },
      { userId: carl, fingerprint: "exams|mth102|unn|100" },
    ].map((r) => ({ ...r, _id: new Types.ObjectId(), materialId, userUpid: "x", fields: {}, status: "pending" }));
    await Suggestion.collection.insertMany(rows);

    await settleSuggestions(materialId, rows[0] as unknown as IMaterialSuggestion);
    await settle();

    const sent = await Notification.find({}).lean();
    const byUser = new Map(sent.map((n) => [String(n.userId), n]));
    expect(byUser.get(ada)).toMatchObject({ type: "suggestion_accepted", link: `/materials/${materialId}` });
    expect(byUser.get(bola)?.type).toBe("suggestion_accepted");
    expect(byUser.get(String(carl))).toMatchObject({ type: "suggestion_declined" });
    expect(byUser.get(String(carl))!.body).toContain("MTH 101 Past Questions 2023");
    expect(sent).toHaveLength(3);
  });
});
