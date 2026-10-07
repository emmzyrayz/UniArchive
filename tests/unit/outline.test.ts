import { describe, expect, it } from "vitest";
import { normalizeLevels, outlineKindFor, parseOutline, OUTLINE_LIMITS } from "@/lib/outline";

describe("outlineKindFor", () => {
  it("gives textbooks a table of contents and notes a course outline", () => {
    expect(outlineKindFor("TEXTBOOK")).toBe("toc");
    expect(outlineKindFor("LECTURE_NOTE")).toBe("course_outline");
    expect(outlineKindFor("PAST_QUESTION")).toBeNull();
    expect(outlineKindFor(undefined)).toBeNull();
  });
});

describe("parseOutline", () => {
  const toc = (entries: unknown[]) => parseOutline({ entries }, "TEXTBOOK", 100);

  it("treats null and empty as no outline", () => {
    expect(parseOutline(null, "TEXTBOOK")).toEqual({ ok: true, value: null });
    expect(parseOutline({ entries: [] }, "PAST_QUESTION")).toEqual({ ok: true, value: null });
  });

  it("takes the kind from the material type, never the client", () => {
    const r = parseOutline({ kind: "toc", entries: [{ title: "Week 1", level: 1 }] }, "LECTURE_NOTE");
    expect(r).toEqual({ ok: true, value: { kind: "course_outline", entries: [{ title: "Week 1", level: 1 }] } });
  });

  it("cleans titles and keeps page labels", () => {
    const r = toc([{ title: "  Chapter   1 ", level: 1, page: "3", pageLabel: " xi " }]);
    expect(r).toEqual({ ok: true, value: { kind: "toc", entries: [{ title: "Chapter 1", level: 1, page: 3, pageLabel: "xi" }] } });
  });

  it.each([
    [[{ title: "A", level: 2, page: 1 }], "indented more than one level"],
    [[{ title: "", level: 1, page: 1 }], "needs a title"],
    [[{ title: "A", level: 4, page: 1 }], "level must be 1, 2 or 3"],
    [[{ title: "A", level: 1 }], "needs a page"],
    [[{ title: "A", level: 1, page: 101 }], "from 1 to 100"],
    [[{ title: "A", level: 1, page: 1.5 }], "whole number"],
    [[{ title: "x".repeat(OUTLINE_LIMITS.title + 1), level: 1, page: 1 }], "longer than"],
    [[{ title: "A", level: 1, page: 1, pageLabel: "x".repeat(21) }], "printed page label"],
  ])("rejects %j", (entries, message) => {
    const r = toc(entries);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain(message);
  });

  it("refuses outlines on types that don't have one, too many entries and bad shapes", () => {
    expect(parseOutline({ entries: [{ title: "A", level: 1 }] }, "PAST_QUESTION").ok).toBe(false);
    const many = Array.from({ length: OUTLINE_LIMITS.entries + 1 }, () => ({ title: "A", level: 1, page: 1 }));
    expect(toc(many).ok).toBe(false);
    expect(parseOutline({ nope: true }, "TEXTBOOK").ok).toBe(false);
  });
});

describe("normalizeLevels", () => {
  it("makes the first entry top level and closes gaps", () => {
    const fixed = normalizeLevels([
      { title: "a", level: 2 },
      { title: "b", level: 3 },
      { title: "c", level: 1 },
      { title: "d", level: 3 },
    ]);
    expect(fixed.map((e) => e.level)).toEqual([1, 2, 1, 2]);
  });
});
