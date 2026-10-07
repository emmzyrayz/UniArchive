import { describe, expect, it } from "vitest";
import { mergePayload, mergeQuestions, reconcile, type LocalDraft } from "@/lib/draftSync";
import type { ConversionDraftDto, DraftNote, DraftQuestion } from "@/lib/conversions";

const q = (id: string, text: string, extra: Partial<DraftQuestion> = {}): DraftQuestion => ({
  clientItemId: id,
  questionType: "theory",
  questionText: text,
  ...extra,
});

describe("mergeQuestions", () => {
  it("keeps local edits and adds items only the server has", () => {
    const merged = mergeQuestions([q("a", "local A")], [q("a", "server A"), q("b", "server B")]);
    expect(merged.map((x) => x.questionText)).toEqual(["local A", "server B"]);
  });

  it("doesn't bring back items deleted on this device, unless they were submitted", () => {
    const merged = mergeQuestions([], [q("gone", "x"), q("sent", "y", { submittedId: "t1" })], ["gone", "sent"]);
    expect(merged.map((x) => x.clientItemId)).toEqual(["sent"]);
  });

  it("takes the submitted copy over a local unsubmitted edit", () => {
    const merged = mergeQuestions([q("a", "edited here")], [q("a", "published", { submittedId: "t1" })]);
    expect(merged[0]).toMatchObject({ questionText: "published", submittedId: "t1" });
  });
});

describe("mergePayload for notes", () => {
  const note = (title: string) => ({ title, contentBlocks: [{ content: title }] }) as unknown as DraftNote;

  it("keeps this device's note and offers the other one", () => {
    const r = mergePayload({ note: note("mine") }, { note: note("theirs") });
    expect(r.payload).toEqual({ note: note("mine") });
    expect(r.otherVersion).toEqual(note("theirs"));
  });

  it("doesn't offer an empty or identical other version", () => {
    expect(mergePayload({ note: note("mine") }, { note: note("") }).otherVersion).toBeUndefined();
    expect(mergePayload({ note: note("same") }, { note: note("same") }).otherVersion).toBeUndefined();
  });
});

describe("reconcile", () => {
  const server = (revision: number, questions: DraftQuestion[]) =>
    ({ id: "d1", revision, payload: { questions } }) as unknown as ConversionDraftDto;
  const local = (extra: Partial<LocalDraft>) =>
    ({ key: "k", draftId: "d1", baseRevision: 1, payload: { questions: [q("a", "local")] }, deleted: [], dirty: false, ...extra }) as LocalDraft;

  it("takes the server copy when nothing local is unsaved", () => {
    const r = reconcile(local({}), server(3, [q("a", "server")]));
    expect(r.changed).toBe(true);
    expect(r.rec.payload).toEqual({ questions: [q("a", "server")] });
    expect(r.rec.baseRevision).toBe(3);
  });

  it("keeps unsaved local work as is when the server hasn't moved", () => {
    const r = reconcile(local({ dirty: true }), server(1, [q("a", "server")]));
    expect(r.changed).toBe(false);
    expect(r.rec.payload).toEqual({ questions: [q("a", "local")] });
  });

  it("merges unsaved local work with a newer server copy", () => {
    const r = reconcile(local({ dirty: true }), server(2, [q("a", "server"), q("b", "new")]));
    expect(r.rec.payload).toEqual({ questions: [q("a", "local"), q("b", "new")] });
    expect(r.rec.baseRevision).toBe(2);
    expect(r.changed).toBe(true);
  });
});
