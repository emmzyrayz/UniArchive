// Archive Scouts (lib/scouts/engine.ts): picking tasks nearest first,
// answering, settling by consensus, paying through the credits economy,
// accuracy pauses, overturning, and identify paying on staff acceptance.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => void Promise.resolve().then(fn),
}));
vi.mock("@/lib/redis", () => ({ redis: { set: async () => "OK", get: async () => null, del: async () => 0 } }));

import { nextTask, overturnSubject, scoutSummary, submitAnswer } from "@/lib/scouts/engine";
import { settleSuggestions } from "@/lib/materialSuggestions";
import { balancesOf } from "@/lib/economy/ledger";
import { userAccount } from "@/lib/economy/currencies";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getScoutAnswerModel } from "@/lib/models/scoutAnswerModel";
import { getMaterialSuggestionModel, type IMaterialSuggestion } from "@/lib/models/materialSuggestionModel";
import { getUserModel } from "@/lib/models/userModel";
import { getLedgerEntryModel } from "@/lib/models/ledgerEntryModel";
import { getWalletModel } from "@/lib/models/walletModel";
import { getNotificationModel } from "@/lib/models/notificationModel";

const uni = new Types.ObjectId();
const otherUni = new Types.ObjectId();
const dept = new Types.ObjectId();
let n = 0;

async function user(extra: Record<string, unknown> = {}) {
  const User = await getUserModel();
  const _id = new Types.ObjectId();
  n++;
  await User.collection.insertOne({
    _id, upid: `u${n}`, uuid: `uuid-${n}-${Date.now()}`, emailHash: `hash-${n}-${Date.now()}`, username: `u${n}`,
    isSuspended: false, universityId: uni, departmentId: dept, ...extra,
  });
  return String(_id);
}

async function material(extra: Record<string, unknown> = {}) {
  const Material = await getMaterialModel();
  const _id = new Types.ObjectId();
  await Material.collection.insertOne({
    _id, bookId: new Types.ObjectId(), submittedBy: new Types.ObjectId(), title: `Material ${_id}`, category: "EXAMS",
    isActive: true, status: "verified", viewCount: 0, universityId: otherUni, ...extra,
  });
  return String(_id);
}

async function question(materialId: string, typist: string, number: number) {
  const TypedQuestion = await getTypedQuestionModel();
  const _id = new Types.ObjectId();
  await TypedQuestion.collection.insertOne({
    _id, materialId: new Types.ObjectId(materialId), submittedBy: new Types.ObjectId(typist), submittedByUpid: "typist",
    questionNumber: number, questionText: `What is ${number}?`, questionType: "theory", status: "pending", answerCount: 0,
  });
  return String(_id);
}

const ac = async (userId: string) => (await balancesOf(userAccount(userId))).AC;

beforeEach(async () => {
  const models = await Promise.all([
    getUserModel(), getMaterialModel(), getTypedQuestionModel(), getScoutAnswerModel(), getMaterialSuggestionModel(),
    getLedgerEntryModel(), getWalletModel(), getNotificationModel(),
  ]);
  await Promise.all(models.map((m) => (m as unknown as { init: () => Promise<unknown> }).init()));
  await Promise.all(models.map((m) => (m as unknown as { deleteMany: (f: object) => Promise<unknown> }).deleteMany({})));
});

const vote = (userId: string, subjectId: string, answer: string, extra: { task?: "readable" | "check_typed"; note?: string; multiplier?: number } = {}) =>
  submitAnswer(userId, { task: extra.task ?? "readable", subjectId, answer, note: extra.note, multiplier: extra.multiplier });

describe("picking a task", () => {
  it("offers the nearest PDF first, never your own, never twice, with a token", async () => {
    const me = await user();
    const far = await material({ viewCount: 100 });
    const near = await material({ departmentId: dept, viewCount: 1 });
    await material({ departmentId: dept, submittedBy: new Types.ObjectId(me) });
    await material({ departmentId: dept, isActive: false });

    const first = await nextTask(me, "readable");
    expect(first).toMatchObject({ task: "readable", material: { materialId: near, reason: "Your department" } });
    expect(typeof (first as { token: string }).token).toBe("string");
    expect((await nextTask(me, "readable", [near]))?.material.materialId).toBe(far);

    await vote(me, near, "readable");
    expect((await nextTask(me, "readable"))?.material.materialId).toBe(far);
    expect(await nextTask(me, "readable", [far])).toBeNull();
  });

  it("identify offers unverified PDFs you haven't suggested for", async () => {
    const me = await user();
    await material({ status: "verified" });
    const open = await material({ status: "unverified" });
    const done = await material({ status: "unverified" });
    await (await getMaterialSuggestionModel()).collection.insertOne({
      materialId: new Types.ObjectId(done), userId: new Types.ObjectId(me), userUpid: "x", fields: {}, fingerprint: "f", status: "pending",
    });
    const card = await nextTask(me, "identify");
    expect(card).toEqual(expect.objectContaining({ task: "identify", material: expect.objectContaining({ materialId: open }) }));
    expect("token" in card!).toBe(false);
    expect(await nextTask(me, "identify", [open])).toBeNull();
  });

  it("check_typed skips your own typing and hides the right option", async () => {
    const me = await user();
    const other = await user();
    const m = await material({ departmentId: dept });
    await question(m, me, 1);
    const q2 = await question(m, other, 2);
    const card = await nextTask(me, "check_typed");
    expect(card).toMatchObject({ task: "check_typed", question: { questionId: q2, number: "2" } });
    expect(await nextTask(other, "check_typed")).toMatchObject({ question: { number: "1" } });
  });

  it("refuses suspended accounts and ones being deleted", async () => {
    const suspended = await user({ isSuspended: true });
    const leaving = await user({ deletion: { requestedAt: new Date(), purgeAfter: new Date() } });
    await expect(nextTask(suspended, "readable")).rejects.toMatchObject({ status: 403 });
    await expect(nextTask(leaving, "readable")).rejects.toMatchObject({ status: 403 });
  });
});

describe("Is this readable?", () => {
  it("settles when three agree and pays only them", async () => {
    const [a, b, c, d] = [await user(), await user(), await user(), await user()];
    const m = await material();
    expect((await vote(a, m, "readable")).settled).toBeNull();
    await vote(d, m, "hard_to_read");
    await vote(b, m, "readable");
    const third = await vote(c, m, "readable");
    expect(third.settled).toEqual({ result: "readable", youAgreed: true, paid: true });

    expect([await ac(a), await ac(b), await ac(c), await ac(d)]).toEqual([3, 3, 3, 0]);
    expect((await balancesOf(userAccount(a))).XP).toBe(5);
    const doc = await (await getMaterialModel()).findById(m).lean();
    expect(doc?.scoutCheck).toMatchObject({ readability: "readable", votes: 4 });
    const statuses = await (await getScoutAnswerModel()).find({ subjectId: m }).sort({ createdAt: 1 }).lean();
    expect(statuses.map((s) => s.status)).toEqual(["confirmed", "disagreed", "confirmed", "confirmed"]);

    const late = await user();
    await expect(vote(late, m, "readable")).rejects.toMatchObject({ code: "limit" });
  });

  it("hides an unverified PDF voted unreadable, flags a verified one", async () => {
    const voters = [await user(), await user(), await user()];
    const unverified = await material({ status: "unverified" });
    const verified = await material();
    for (const v of voters) {
      await vote(v, unverified, "unreadable");
      await vote(v, verified, "not_study");
    }
    const Material = await getMaterialModel();
    expect((await Material.findById(unverified).lean())?.hiddenByReports).toBe(true);
    const v = await Material.findById(verified).lean();
    expect(v?.hiddenByReports).toBeUndefined();
    expect(v?.scoutCheck?.flagged).toBe(true);
  });

  it("refuses bad answers, your own upload and a second answer", async () => {
    const me = await user();
    const mine = await material({ submittedBy: new Types.ObjectId(me) });
    const m = await material();
    await expect(vote(me, mine, "readable")).rejects.toMatchObject({ status: 403 });
    await expect(vote(me, m, "lovely")).rejects.toMatchObject({ code: "invalid" });
    await vote(me, m, "readable");
    await expect(vote(me, m, "hard_to_read")).rejects.toThrow(/already answered/);
  });

  it("gets stuck without agreement and pays nobody", async () => {
    const m = await material();
    // Seven answers, no three alike
    const answers = ["readable", "hard_to_read", "unreadable", "not_study", "readable", "hard_to_read", "unreadable"];
    const people = [];
    for (const a of answers) {
      const u = await user();
      people.push(u);
      await vote(u, m, a);
    }
    const doc = await (await getMaterialModel()).findById(m).lean();
    expect(doc?.scoutCheck?.stuck).toBe(true);
    const statuses = await (await getScoutAnswerModel()).distinct("status", { subjectId: m });
    expect(statuses).toEqual(["stuck"]);
    for (const u of people) expect(await ac(u)).toBe(0);
  });

  it("applies the streak multiplier the answer was given with", async () => {
    const m = await material();
    const [a, b, c] = [await user(), await user(), await user()];
    await vote(a, m, "readable", { multiplier: 1.5 });
    await vote(b, m, "readable");
    await vote(c, m, "readable");
    expect([await ac(a), await ac(b)]).toEqual([5, 3]);
  });

  it("settles once when the deciding answers arrive together", async () => {
    const m = await material();
    const people = [await user(), await user(), await user(), await user(), await user()];
    await vote(people[0], m, "readable");
    await vote(people[1], m, "readable");
    // Late ones may be told it's already settled; none may fail otherwise
    const results = await Promise.allSettled(people.slice(2).map((p) => vote(p, m, "readable")));
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "limit" });
    const confirmed = await (await getScoutAnswerModel()).countDocuments({ subjectId: m, status: "confirmed" });
    const paid = await (await getLedgerEntryModel()).countDocuments({ source: "scouts.readable" });
    expect(paid).toBe(confirmed);
    expect(confirmed).toBeGreaterThanOrEqual(3);
    expect(await (await getLedgerEntryModel()).countDocuments({ source: "scouts.readable", "meta.subjectId": m })).toBe(confirmed);
  });

  it("takes credits back when staff overturn the result", async () => {
    const m = await material({ status: "unverified" });
    const people = [await user(), await user(), await user()];
    for (const p of people) await vote(p, m, "unreadable");
    expect(await ac(people[0])).toBe(3);
    expect(await overturnSubject("readable", m, { note: "Readable after all" })).toBe(3);
    for (const p of people) expect(await ac(p)).toBe(0);
    expect(await (await getScoutAnswerModel()).distinct("status", { subjectId: m })).toEqual(["overturned"]);
  });
});

describe("accuracy", () => {
  it("stops counting a guesser's answers until they recover", async () => {
    const guesser = await user();
    const ScoutAnswer = await getScoutAnswerModel();
    await ScoutAnswer.collection.insertMany(
      Array.from({ length: 20 }, (_, i) => ({
        userId: new Types.ObjectId(guesser), task: "readable", subjectId: new Types.ObjectId(), materialId: new Types.ObjectId(),
        answer: "readable", status: i < 6 ? "confirmed" : "disagreed", counted: true, multiplier: 1, createdAt: new Date(),
      })),
    );
    const m = await material();
    const res = await vote(guesser, m, "readable");
    expect(res.counted).toBe(false);
    const [a, b, c] = [await user(), await user(), await user()];
    await vote(a, m, "readable");
    await vote(b, m, "readable");
    // The guesser's answer doesn't count: two counted, still open
    expect((await (await getMaterialModel()).findById(m).lean())?.scoutCheck?.settledAt).toBeUndefined();
    await vote(c, m, "readable");
    expect(await ac(a)).toBe(3);
    // Agreed (counts toward recovering accuracy) but not paid
    expect(await ac(guesser)).toBe(0);
    expect((await ScoutAnswer.findOne({ userId: new Types.ObjectId(guesser), subjectId: m }).lean())?.status).toBe("confirmed");
    const summary = await scoutSummary(guesser);
    expect(summary.find((t) => t.task === "readable")?.accuracy?.paused).toBe(true);
  });
});

describe("Check a typed answer", () => {
  it("verifies a question three Scouts say matches, and pays its typist", async () => {
    const typist = await user();
    const m = await material();
    const q = await question(m, typist, 4);
    for (let i = 0; i < 3; i++) await vote(await user(), q, "correct", { task: "check_typed" });
    await new Promise((r) => setTimeout(r, 20));
    const doc = await (await getTypedQuestionModel()).findById(q).lean();
    expect(doc).toMatchObject({ status: "verified", scoutCheck: { result: "correct" } });
    expect(await ac(typist)).toBe(5);
    const note = await (await getNotificationModel()).findOne({ userId: new Types.ObjectId(typist) }).lean();
    expect(note).toMatchObject({ type: "typed_verified", link: `/materials/${m}?tab=questions` });
  });

  it("disputes one with mistakes and tells the typist what's wrong", async () => {
    const typist = await user();
    const q = await question(await material(), typist, 2);
    const first = await user();
    await expect(vote(first, q, "mistakes", { task: "check_typed" })).rejects.toThrow(/what's wrong/);
    await vote(first, q, "mistakes", { task: "check_typed", note: "x^2 should be x^3" });
    await vote(await user(), q, "mistakes", { task: "check_typed", note: "Option C missing" });
    await vote(await user(), q, "mistakes", { task: "check_typed", note: "x^2 should be x^3" });
    await new Promise((r) => setTimeout(r, 20));
    const doc = await (await getTypedQuestionModel()).findById(q).lean();
    expect(doc?.status).toBe("disputed");
    expect(doc?.scoutCheck?.notes?.sort()).toEqual(["Option C missing", "x^2 should be x^3"]);
    expect(await ac(typist)).toBe(0);
    const note = await (await getNotificationModel()).findOne({ userId: new Types.ObjectId(typist) }).lean();
    expect(note?.type).toBe("typed_disputed");
    expect(note?.body).toContain("Option C missing");
  });

  it("won't let you check your own typing", async () => {
    const typist = await user();
    const q = await question(await material(), typist, 1);
    await expect(vote(typist, q, "correct", { task: "check_typed" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("Identify a PDF", () => {
  it("pays every suggestion staff accept, once", async () => {
    const [a, b, c] = [await user(), await user(), await user()];
    const m = await material({ status: "unverified" });
    const Suggestion = await getMaterialSuggestionModel();
    const rows = [a, b, c].map((u, i) => ({
      _id: new Types.ObjectId(), materialId: new Types.ObjectId(m), userId: new Types.ObjectId(u), userUpid: "x",
      fields: {}, fingerprint: i < 2 ? "exams|mth101|unn|100" : "exams|mth102|unn|100", status: "pending",
    }));
    await Suggestion.collection.insertMany(rows);
    await settleSuggestions(new Types.ObjectId(m), rows[0] as unknown as IMaterialSuggestion);
    expect([await ac(a), await ac(b), await ac(c)]).toEqual([15, 15, 0]);
    // Settling again (a retry) pays nothing more
    await settleSuggestions(new Types.ObjectId(m), rows[0] as unknown as IMaterialSuggestion);
    expect(await ac(a)).toBe(15);
  });
});

describe("the hub", () => {
  it("counts what's waiting and what's pending", async () => {
    const me = await user();
    await material({ status: "unverified" });
    const m = await material();
    await vote(me, m, "readable");
    const summary = await scoutSummary(me);
    const by = Object.fromEntries(summary.map((t) => [t.task, t]));
    expect(by.identify).toMatchObject({ waiting: 1, accuracy: null });
    expect(by.readable).toMatchObject({ waiting: 1, answered: 1, pending: 1 });
    expect(by.check_typed.waiting).toBe(0);
  });
});
