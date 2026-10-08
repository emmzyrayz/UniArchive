import { describe, expect, it } from "vitest";
import { accuracyOf, decideConsensus } from "@/lib/scouts/consensus";
import { checkTaskToken, issueTaskToken } from "@/lib/scouts/token";
import { MIN_SECONDS, TOKEN_TTL_SECONDS } from "@/lib/scouts/taskTypes";

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
