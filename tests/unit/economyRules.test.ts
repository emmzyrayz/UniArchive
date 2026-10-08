import { describe, expect, it } from "vitest";
import { MAX_LEVEL, levelFromXp, levelTitle, xpForLevel } from "@/lib/economy/levels";
import { boosted, underCaps } from "@/lib/economy/earn";
import { isUserAccount, isValidAccount, mayGoNegative, userIdOf } from "@/lib/economy/currencies";

describe("levels", () => {
  it("follows the curve", () => {
    expect([1, 2, 3, 5, 10, 20].map(xpForLevel)).toEqual([0, 100, 280, 880, 3780, 15580]);
  });

  it("finds the level for any XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, title: "Rookie Scout", xp: 0, intoLevel: 0, levelSpan: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toMatchObject({ level: 2, intoLevel: 0, levelSpan: 180 });
    expect(levelFromXp(900)).toMatchObject({ level: 5, title: "Scout", intoLevel: 20 });
    expect(levelFromXp(-5).level).toBe(1);
    expect(levelFromXp(10 ** 9)).toMatchObject({ level: MAX_LEVEL, levelSpan: 0, title: "Legend" });
  });

  it("names the tiers", () => {
    expect([1, 4, 5, 10, 20, 30, 40, 60, 99].map(levelTitle)).toEqual([
      "Rookie Scout", "Rookie Scout", "Scout", "Senior Scout", "Pathfinder", "Archivist", "Master Archivist", "Legend", "Legend",
    ]);
  });
});

describe("earning rules", () => {
  it("boosts and rounds, within 1x-2x", () => {
    expect(boosted({ AC: 10, XP: 15 }, 1.25)).toEqual({ AC: 13, XP: 19 });
    expect(boosted({ AC: 10 }, 0.5)).toEqual({ AC: 10, XP: 0 });
    expect(boosted({ AC: 10 }, 5)).toEqual({ AC: 20, XP: 0 });
    expect(boosted({ AC: 10 }, Number.NaN)).toEqual({ AC: 10, XP: 0 });
  });

  it("fits a payment under every cap", () => {
    expect(underCaps(10, [])).toBe(10);
    expect(underCaps(10, [25, undefined])).toBe(10);
    expect(underCaps(10, [25, 4])).toBe(4);
    expect(underCaps(10, [-3])).toBe(0);
  });
});

describe("accounts", () => {
  it("knows people from system accounts", () => {
    expect(isUserAccount("user:abc")).toBe(true);
    expect(isUserAccount("user:former")).toBe(false);
    expect(userIdOf("user:abc")).toBe("abc");
    expect(userIdOf("system:mint")).toBeNull();
    expect(isValidAccount("escrow:65f0c0ffee")).toBe(true);
    expect(isValidAccount("user:")).toBe(false);
    expect(isValidAccount("USER:x")).toBe(false);
    expect(mayGoNegative("system:mint")).toBe(true);
    expect(mayGoNegative("system:treasury")).toBe(false);
  });
});
