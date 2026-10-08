import { describe, expect, it } from "vitest";
import { accuracyOf, decideConsensus } from "@/lib/scouts/consensus";
import { checkTaskToken, issueTaskToken } from "@/lib/scouts/token";
import { MIN_SECONDS, TOKEN_TTL_SECONDS } from "@/lib/scouts/taskTypes";
import { freezePlan, multiplierFor, nextMilestone, repairOption, streakFrom } from "@/lib/scouts/streaks";

describe("consensus", () => {
  it("settles on the first answer to reach three", () => {
    expect(decideConsensus([])).toEqual({ kind: "open" });
    expect(decideConsensus(["a", "a"])).toEqual({ kind: "open" });
    expect(decideConsensus(["a", "b", "a", "a"])).toEqual({ kind: "settled", value: "a" });
    expect(decideConsensus(["b", "a", "b", "a", "a", "b"])).toEqual({ kind: "settled", value: "a" });
  });

  it("gets stuck after seven without agreement", () => {
    expect(decideConsensus(["a", "b", "c", "d", "a", "b"])).toEqual({ kind: "open" });
    expect(decideConsensus(["a", "b", "c", "d", "a", "b", "c"])).toEqual({ kind: "stuck" });
    // A triple on the seventh answer still settles
    expect(decideConsensus(["a", "b", "c", "d", "a", "b", "a"])).toEqual({ kind: "settled", value: "a" });
  });
});

describe("accuracy", () => {
  it("pauses only after enough settled answers below 60%", () => {
    expect(accuracyOf(0, 0)).toEqual({ settled: 0, confirmed: 0, rate: null, paused: false });
    expect(accuracyOf(2, 17).paused).toBe(false); // 19 settled: too few to judge
    expect(accuracyOf(11, 9).paused).toBe(true); // 55%
    expect(accuracyOf(12, 8).paused).toBe(false); // 60%
  });
});

describe("task tokens", () => {
  const user = "65f0c0ffee0000000000aaaa";
  const t0 = Date.parse("2026-10-08T12:00:00Z");
  const token = issueTaskToken(user, "readable", "65f0c0ffee0000000000bbbb", t0);

  it("checks out for the same person after the minimum time", () => {
    expect(checkTaskToken(token, user, t0 + MIN_SECONDS * 1000)).toEqual({
      ok: true,
      task: "readable",
      subjectId: "65f0c0ffee0000000000bbbb",
    });
  });

  it("refuses early, late, someone else's and tampered tokens", () => {
    expect(checkTaskToken(token, user, t0 + 1000)).toEqual({ ok: false, reason: "too_soon" });
    expect(checkTaskToken(token, user, t0 + (TOKEN_TTL_SECONDS + 1) * 1000)).toEqual({ ok: false, reason: "expired" });
    expect(checkTaskToken(token, "65f0c0ffee0000000000cccc", t0 + 10_000).ok).toBe(false);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: user, t: "readable", s: "x", i: 0 })).toString("base64url");
    expect(checkTaskToken(`${forged}.${sig}`, user, t0 + 10_000)).toEqual({ ok: false, reason: "invalid" });
    expect(checkTaskToken(`${payload}.${sig.slice(0, -2)}xx`, user, t0 + 10_000).ok).toBe(false);
    expect(checkTaskToken("junk", user).ok).toBe(false);
    expect(checkTaskToken(42, user).ok).toBe(false);
  });
});

describe("streaks", () => {
  // Noon in Lagos on 2026-10-08
  const now = new Date("2026-10-08T11:00:00Z");
  const day = (back: number) => new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  const counts = (entries: [number, number][]) => new Map(entries.map(([back, n]) => [day(back), n]));

  it("counts days with three tasks, ending today or yesterday", () => {
    expect(streakFrom(counts([]), now)).toMatchObject({ current: 0, best: 0, today: 0, todayDone: false, multiplier: 1 });
    // Yesterday and the two days before done; today not yet
    const s = streakFrom(counts([[1, 3], [2, 5], [3, 3], [0, 2]]), now);
    expect(s).toMatchObject({ current: 3, today: 2, todayDone: false, multiplier: 1.1, next: { days: 7, multiplier: 1.25 } });
    // Today done too
    expect(streakFrom(counts([[0, 3], [1, 3]]), now)).toMatchObject({ current: 2, todayDone: true });
    // A day with only two breaks it
    expect(streakFrom(counts([[1, 3], [2, 2], [3, 3]]), now).current).toBe(1);
    // Missed yesterday: gone
    expect(streakFrom(counts([[2, 3], [3, 3]]), now).current).toBe(0);
  });

  it("remembers the best run and counts covered days", () => {
    const old = counts(Array.from({ length: 9 }, (_, i) => [20 + i, 3] as [number, number]));
    expect(streakFrom(old, now)).toMatchObject({ current: 0, best: 9 });
    const covered = new Set([day(2)]);
    expect(streakFrom(counts([[1, 3], [3, 3]]), now, covered).current).toBe(3);
  });

  it("multiplies by streak length", () => {
    expect([0, 2, 3, 6, 7, 13, 14, 99].map(multiplierFor)).toEqual([1, 1, 1.1, 1.1, 1.25, 1.25, 1.5, 1.5]);
    expect(nextMilestone(0)).toEqual({ days: 3, multiplier: 1.1 });
    expect(nextMilestone(8)).toEqual({ days: 14, multiplier: 1.5 });
    expect(nextMilestone(14)).toBeNull();
  });
});

describe("streak protection", () => {
  const now = new Date("2026-10-08T11:00:00Z");
  const day = (back: number) => new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  const counts = (backs: number[]) => new Map(backs.map((b) => [day(b), 3]));
  const none = new Set<string>();

  it("freezes cover a gap ending yesterday, if enough are held", () => {
    expect(freezePlan(counts([2, 3]), none, 1, now)).toEqual([day(1)]);
    expect(freezePlan(counts([3, 4]), none, 2, now)).toEqual([day(1), day(2)]);
    expect(freezePlan(counts([3, 4]), none, 1, now)).toEqual([]);
    expect(freezePlan(counts([1, 2]), none, 2, now)).toEqual([]); // yesterday done
    expect(freezePlan(counts([0, 1]), none, 2, now)).toEqual([]); // today is never covered
    expect(freezePlan(counts([]), none, 2, now)).toEqual([]); // no streak to save
    expect(freezePlan(counts([2]), none, 0, now)).toEqual([]);
    expect(freezePlan(counts([3]), new Set([day(2)]), 1, now)).toEqual([day(1)]);
  });

  it("repairs one recent missed day after a run of 3+", () => {
    expect(repairOption(counts([2, 3, 4]), none, now)).toEqual({ day: day(1), restoresTo: 4 });
    // Missed the day before yesterday, did yesterday
    expect(repairOption(counts([1, 3, 4, 5]), none, now)).toEqual({ day: day(2), restoresTo: 5 });
    expect(repairOption(counts([0, 1, 3, 4, 5]), none, now)).toEqual({ day: day(2), restoresTo: 6 });
    expect(repairOption(counts([3, 4, 5]), none, now)).toBeNull(); // two days missed
    expect(repairOption(counts([2, 3]), none, now)).toBeNull(); // run of 2
    expect(repairOption(counts([1, 2, 3]), none, now)).toBeNull(); // nothing broken
    expect(repairOption(counts([2, 3, 4]), new Set([day(1)]), now)).toBeNull(); // already covered
  });
});
