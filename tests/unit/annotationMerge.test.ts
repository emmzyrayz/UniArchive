import { describe, expect, it } from "vitest";
import { mergeById, onePerPage, sameContent, threeWayMerge } from "@/lib/annotationMerge";

type H = { id: string; note?: string };
const h = (id: string, note?: string): H => (note === undefined ? { id } : { id, note });

describe("threeWayMerge (two tabs saving annotations)", () => {
  it("keeps additions from both sides", () => {
    const merged = threeWayMerge([h("a")], [h("a"), h("mine")], [h("a"), h("theirs")]);
    expect(merged.map((x) => x.id)).toEqual(["a", "theirs", "mine"]);
  });

  it("makes a deletion on either side stick", () => {
    expect(threeWayMerge([h("a"), h("b")], [h("b")], [h("a"), h("b")]).map((x) => x.id)).toEqual(["b"]);
    expect(threeWayMerge([h("a"), h("b")], [h("a"), h("b")], [h("b")]).map((x) => x.id)).toEqual(["b"]);
  });

  it("keeps a note written in this tab when the other tab didn't touch it", () => {
    const merged = threeWayMerge([h("a")], [h("a", "my note")], [h("a"), h("other")]);
    expect(merged).toEqual([h("a", "my note"), h("other")]);
  });

  it("takes the other tab's version when both edited the same highlight", () => {
    const merged = threeWayMerge([h("a", "old")], [h("a", "mine")], [h("a", "theirs")]);
    expect(merged).toEqual([h("a", "theirs")]);
  });

  it("takes the other tab's edit when this tab didn't change it", () => {
    expect(threeWayMerge([h("a")], [h("a")], [h("a", "theirs")])).toEqual([h("a", "theirs")]);
  });

  it("keeps a note cleared in this tab", () => {
    expect(threeWayMerge([h("a", "old")], [h("a")], [h("a", "old")])).toEqual([h("a")]);
  });
});

describe("helpers", () => {
  it("mergeById puts the server's items first and keeps local-only ones", () => {
    expect(mergeById([h("s")], [h("s", "local copy"), h("l")])).toEqual([h("s"), h("l")]);
  });

  it("sameContent compares content, not just ids", () => {
    expect(sameContent([h("a"), h("b")], [h("b"), h("a")])).toBe(true);
    expect(sameContent([h("a", "x")], [h("a")])).toBe(false);
    expect(sameContent([h("a")], [h("a"), h("b")])).toBe(false);
  });

  it("onePerPage keeps the first bookmark on each page", () => {
    const b = (id: string, pageNumber: number) => ({ id, pageNumber, createdAt: "" });
    expect(onePerPage([b("1", 3), b("2", 3), b("3", 4)]).map((x) => x.id)).toEqual(["1", "3"]);
  });
});
