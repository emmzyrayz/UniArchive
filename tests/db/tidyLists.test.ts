// Tidying per-broadcast Brevo lists (lib/broadcast/tidyLists.ts) against
// an in-process stand-in for Brevo's API.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { tidyBroadcastLists } from "@/lib/broadcast/tidyLists";
import { getBroadcastModel } from "@/lib/models/broadcastModel";

const FOLDER = 5;
let lists: Map<number, { name: string; folderId: number; failDelete?: boolean }>;
let nextId = 100;
const deletes: number[] = [];

function fakeBrevo(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const json = (status: number, body?: unknown) =>
    Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  if (method === "GET" && url.pathname === "/v3/contacts/folders") {
    return json(200, { folders: [{ id: 1, name: "Other" }, { id: FOLDER, name: "UniArchive broadcasts" }] });
  }
  let m = /^\/v3\/contacts\/folders\/(\d+)\/lists$/.exec(url.pathname);
  if (method === "GET" && m) {
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    const all = [...lists].filter(([, l]) => l.folderId === Number(m![1])).map(([id, l]) => ({ id, name: l.name }));
    return json(200, { lists: all.slice(offset, offset + limit), count: all.length });
  }
  m = /^\/v3\/contacts\/lists\/(\d+)$/.exec(url.pathname);
  if (method === "DELETE" && m) {
    const id = Number(m[1]);
    if (!lists.has(id)) return json(404, { message: "List ID does not exist" });
    if (lists.get(id)!.failDelete) return json(500, { message: "internal error" });
    lists.delete(id);
    deletes.push(id);
    return json(204);
  }
  return json(404, { message: `no route ${method} ${url.pathname}` });
}

const DAY = 864e5;
const stamp = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 16).replace("T", " ");
const staff = { userId: new Types.ObjectId(), upid: "grace", name: "Grace" };

async function seed(status: string, { age = 0, owns = true, name }: { age?: number; owns?: boolean; name?: string } = {}) {
  const _id = new Types.ObjectId();
  const listId = nextId++;
  lists.set(listId, { name: name ?? `UA broadcast ${_id} (${stamp(age)})`, folderId: FOLDER });
  const at = new Date(Date.now() - age);
  const Broadcast = await getBroadcastModel();
  await Broadcast.collection.insertOne({
    _id,
    name: status,
    templateId: "general_announcement",
    kind: "announcements",
    fields: {},
    audience: {},
    status,
    createdBy: staff,
    updatedBy: staff,
    createdAt: at,
    updatedAt: at,
    ...(owns && { brevoListId: listId }),
    ...(status === "sent" && { sentAt: at }),
  });
  return { _id, listId };
}
const orphan = (age: number) => {
  const id = nextId++;
  lists.set(id, { name: `UA broadcast ${new Types.ObjectId()} (${stamp(age)})`, folderId: FOLDER });
  return id;
};

beforeAll(() => {
  process.env.BREVO_API_KEY = "test-key";
  process.env.BREVO_API_URL = "https://brevo.test/v3";
  vi.stubGlobal("fetch", vi.fn(fakeBrevo));
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(async () => {
  lists = new Map();
  deletes.length = 0;
  await (await getBroadcastModel()).deleteMany({});
});

describe("tidyBroadcastLists", () => {
  it("deletes what's due and keeps the rest", async () => {
    const sentOld = await seed("sent", { age: 40 * DAY });
    const sentNew = await seed("sent", { age: 5 * DAY });
    const scheduled = await seed("scheduled", { age: 60 * DAY });
    const failedOld = await seed("failed", { age: 40 * DAY });
    const cancelledNew = await seed("cancelled", { age: 10 * DAY });
    const retried = await seed("draft", { age: 3 * DAY, owns: false });
    const sending = await seed("sending", { age: 2 * 3600e3, owns: false });
    const manual = await seed("sent", { age: 40 * DAY, name: "Webinar guests" });
    const ghost = orphan(3 * DAY);
    const freshGhost = orphan(3600e3);

    const dry = await tidyBroadcastLists({ apply: false });
    expect(dry.dryRun).toBe(true);
    expect(dry.deleted.map((d) => d.id).sort()).toEqual([sentOld.listId, failedOld.listId, retried.listId, ghost].sort());
    expect(deletes).toEqual([]);

    const run = await tidyBroadcastLists({ apply: true });
    expect(run).toMatchObject({ checked: 10, kept: 6, failed: [], more: false });
    expect(deletes.sort()).toEqual([sentOld.listId, failedOld.listId, retried.listId, ghost].sort());
    for (const kept of [sentNew, scheduled, cancelledNew, sending, manual]) expect(lists.has(kept.listId)).toBe(true);
    expect(lists.has(freshGhost)).toBe(true);

    const Broadcast = await getBroadcastModel();
    expect((await Broadcast.findById(sentOld._id).lean())?.brevoListDeletedAt).toBeInstanceOf(Date);
    expect((await Broadcast.findById(sentNew._id).lean())?.brevoListDeletedAt).toBeUndefined();
  });

  it("pages through big folders and stops at the limit", async () => {
    for (let i = 0; i < 120; i++) orphan(5 * DAY);
    const first = await tidyBroadcastLists({ apply: true, limit: 50 });
    expect(first).toMatchObject({ checked: 120, more: true });
    expect(first.deleted).toHaveLength(50);
    const rest = await tidyBroadcastLists({ apply: true, limit: 100 });
    expect(rest.deleted).toHaveLength(70);
    expect(lists.size).toBe(0);
  });

  it("reports a failed delete and carries on", async () => {
    const bad = orphan(5 * DAY);
    lists.get(bad)!.failDelete = true;
    const good = orphan(5 * DAY);
    const r = await tidyBroadcastLists({ apply: true });
    expect(r.failed.map((f) => f.id)).toEqual([bad]);
    expect(r.deleted.map((d) => d.id)).toEqual([good]);
  });
});
