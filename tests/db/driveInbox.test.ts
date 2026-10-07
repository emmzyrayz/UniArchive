// The platform Drive inbox (lib/drive/inbox.ts): connecting the account and
// the daily check, against a fake Google (token endpoint + Drive API), with
// storage, Cloudinary and badges mocked.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { Types } from "mongoose";

vi.mock("@/lib/storage", () => ({
  storageClient: {
    getPublicUrl: (key: string) => `https://b2.test/${key}`,
    generateUniqueFileName: (name: string) => `${name.replace(/\.pdf$/i, "")}_${crypto.randomUUID().slice(0, 8)}.pdf`,
    uploadFile: async () => ({ success: true }),
    uploadStream: async (body: AsyncIterable<Buffer>) => {
      for await (const chunk of body) void chunk;
      return { success: true };
    },
    deleteFile: async () => ({ success: true }),
  },
}));
vi.mock("@/lib/cloudinary", () => ({ uploadPdfFromServer: async () => ({}) }));
vi.mock("@/lib/badges", () => ({ awardBadgesAfter: vi.fn() }));

const { connectInbox, runInboxCheck, InboxError } = await import("@/lib/drive/inbox");
const { getPlatformDriveConnectionModel } = await import("@/lib/models/platformDriveConnectionModel");
const { getBookModel } = await import("@/lib/models/bookModel");
const { getDriveImportModel } = await import("@/lib/models/driveImportModel");
const { getMaterialModel } = await import("@/lib/models/materialModel");
const { decryptSensitiveData, encryptSensitiveData } = await import("@/lib/encryption");

// --- Fake Google -------------------------------------------------------------------
const FOLDER = "application/vnd.google-apps.folder";
const pdf = (t: string) => Buffer.from(`%PDF-1.4\n% ${t}\n`);
type F = { id: string; name: string; mimeType: string; bytes?: Buffer; parent?: string; sharedWithMe?: boolean; sharer?: string };
let files: F[] = [];
let tokenReply: { status: number; body: Record<string, unknown> } = { status: 200, body: { access_token: "access-1", expires_in: 3600 } };
const tokenRequests: URLSearchParams[] = [];
const idToken = (email: string) =>
  `x.${Buffer.from(JSON.stringify({ email, email_verified: true })).toString("base64url")}.y`;

function fakeGoogle(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  if (url.href.startsWith("https://oauth.test/token")) {
    tokenRequests.push(new URLSearchParams(String(init?.body)));
    return json(tokenReply.status, tokenReply.body);
  }
  const meta = (f: F) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    ...(f.bytes && { size: String(f.bytes.length), md5Checksum: crypto.createHash("md5").update(f.bytes).digest("hex") }),
    ...(f.sharer && { sharingUser: { displayName: f.sharer, emailAddress: `${f.sharer.toLowerCase()}@example.com` } }),
  });
  if (url.pathname === "/drive/v3/files") {
    const q = url.searchParams.get("q") ?? "";
    const parent = /'([^']+)' in parents/.exec(q)?.[1];
    const list = q.includes("sharedWithMe") ? files.filter((f) => f.sharedWithMe) : files.filter((f) => f.parent === parent);
    return json(200, { files: list.map(meta) });
  }
  const m = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
  const f = m && files.find((x) => x.id === m[1]);
  if (!f) return json(404, { error: { errors: [{ reason: "notFound" }] } });
  if (url.searchParams.get("alt") === "media") return Promise.resolve(new Response(new Uint8Array(f.bytes!), { status: 200 }));
  return json(200, meta(f));
}

const admin = { userId: String(new Types.ObjectId()), upid: "grace" };

beforeAll(async () => {
  process.env.DRIVE_API_URL = "https://drive.test/drive/v3";
  process.env.DRIVE_OAUTH_TOKEN_URL = "https://oauth.test/token";
  process.env.DRIVE_INBOX_CLIENT_ID = "inbox-client";
  process.env.DRIVE_INBOX_CLIENT_SECRET = "inbox-secret";
  process.env.PLATFORM_DRIVE_EMAIL = "uniarchive.team@gmail.com";
  vi.stubGlobal("fetch", vi.fn(fakeGoogle));
  await Promise.all([
    (await getPlatformDriveConnectionModel()).init(),
    (await getBookModel()).init(),
    (await getDriveImportModel()).init(),
    (await getMaterialModel()).init(),
  ]);
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  tokenReply = { status: 200, body: { access_token: "access-1", expires_in: 3600 } };
});

const DRIVE_SCOPE = "openid email https://www.googleapis.com/auth/drive.readonly";

describe("connectInbox", () => {
  it("refuses another account, missing Drive access, or no refresh token", async () => {
    tokenReply = { status: 200, body: { access_token: "a", refresh_token: "r", scope: DRIVE_SCOPE, id_token: idToken("someone@gmail.com") } };
    await expect(connectInbox("code", admin)).rejects.toThrow(/Connect the UniArchive account/);
    tokenReply = { status: 200, body: { access_token: "a", refresh_token: "r", scope: "openid email", id_token: idToken("uniarchive.team@gmail.com") } };
    await expect(connectInbox("code", admin)).rejects.toThrow(/Drive access wasn't allowed/);
    tokenReply = { status: 200, body: { access_token: "a", scope: DRIVE_SCOPE, id_token: idToken("uniarchive.team@gmail.com") } };
    await expect(connectInbox("code", admin)).rejects.toBeInstanceOf(InboxError);
    expect(await (await getPlatformDriveConnectionModel()).countDocuments()).toBe(0);
  });

  it("is not connected yet", async () => {
    expect(await runInboxCheck(60_000)).toEqual({ status: "not_connected" });
  });

  it("stores the refresh token encrypted", async () => {
    tokenReply = {
      status: 200,
      body: { access_token: "a", refresh_token: "refresh-secret", scope: DRIVE_SCOPE, id_token: idToken("UniArchive.Team@gmail.com") },
    };
    expect(await connectInbox("the-code", admin)).toBe("uniarchive.team@gmail.com");
    const conn = await (await getPlatformDriveConnectionModel()).findOne({ key: "inbox" }).lean();
    expect(conn?.refreshToken).not.toContain("refresh-secret");
    expect(decryptSensitiveData(conn!.refreshToken)).toBe("refresh-secret");
    expect(conn).toMatchObject({ accountEmail: "uniarchive.team@gmail.com", status: "ok", connectedBy: { upid: "grace" } });
    expect(tokenRequests.at(-1)?.get("grant_type")).toBe("authorization_code");
  });
});

describe("runInboxCheck", () => {
  it("imports shared PDFs and PDFs in shared folders into the staff queue", async () => {
    files = [
      { id: "shared-pdf-1", name: "MTH 101 past questions.pdf", mimeType: "application/pdf", bytes: pdf("a"), sharedWithMe: true, sharer: "Chi" },
      { id: "shared-folder", name: "Year 2 notes", mimeType: FOLDER, sharedWithMe: true, sharer: "Bola" },
      { id: "in-folder-1", name: "Lecture 1.pdf", mimeType: "application/pdf", bytes: pdf("b"), parent: "shared-folder" },
      { id: "in-folder-2", name: "Lecture 2.pdf", mimeType: "application/pdf", bytes: pdf("c"), parent: "shared-folder" },
      { id: "shared-doc", name: "A Google Doc", mimeType: "application/vnd.google-apps.document", sharedWithMe: true },
    ];
    const r = await runInboxCheck(60_000);
    expect(r).toMatchObject({ status: "done", summary: { found: 3, imported: 3, duplicate: 0, failed: 0, remaining: 0 } });
    expect(tokenRequests.at(-1)?.get("refresh_token")).toBe("refresh-secret");

    const books = await (await getBookModel()).find({ "platform.source": "drive_inbox" }).lean();
    expect(books).toHaveLength(3);
    const lecture = books.find((b) => b.title === "Lecture 1");
    expect(lecture?.platform).toMatchObject({ uploadedByUpid: "grace", drive: { fileId: "in-folder-1", sharedByName: "Bola" } });
    expect(decryptSensitiveData(lecture!.platform!.drive!.sharedByEmail!)).toBe("bola@example.com");
    expect(lecture?.storageKey).toMatch(/^platform\/inbox\//);
    expect(await (await getMaterialModel()).countDocuments({ status: "unverified" })).toBe(3);

    const conn = await (await getPlatformDriveConnectionModel()).findOne({ key: "inbox" }).lean();
    expect(conn?.lastCheck).toMatchObject({ found: 3, imported: 3 });
    expect(conn?.lockUntil).toBeUndefined();
  });

  it("finds nothing new the next time", async () => {
    const r = await runInboxCheck(60_000);
    expect(r).toMatchObject({ status: "done", summary: { found: 0, imported: 0 } });
  });

  it("stops at the time budget and leaves the rest for the next run", async () => {
    files.push(
      { id: "late-1", name: "Late 1.pdf", mimeType: "application/pdf", bytes: pdf("late1"), sharedWithMe: true },
      { id: "late-2", name: "Late 2.pdf", mimeType: "application/pdf", bytes: pdf("late2"), sharedWithMe: true },
    );
    const r = await runInboxCheck(-1);
    expect(r).toMatchObject({ status: "done", summary: { found: 2, imported: 0, remaining: 2 } });
    expect(await runInboxCheck(60_000)).toMatchObject({ summary: { imported: 2, remaining: 0 } });
  });

  it("gives up on a file after three failures", async () => {
    files.push({ id: "broken-1", name: "Broken.pdf", mimeType: "application/pdf", bytes: Buffer.from("not a pdf"), sharedWithMe: true });
    for (let i = 0; i < 3; i++) expect(await runInboxCheck(60_000)).toMatchObject({ summary: { failed: 1 } });
    expect(await runInboxCheck(60_000)).toMatchObject({ summary: { found: 0, failed: 0 } });
  });

  it("one check at a time", async () => {
    const Connection = await getPlatformDriveConnectionModel();
    await Connection.updateOne({ key: "inbox" }, { $set: { lockUntil: new Date(Date.now() + 60_000) } });
    expect(await runInboxCheck(60_000)).toEqual({ status: "busy" });
    await Connection.updateOne({ key: "inbox" }, { $unset: { lockUntil: 1 } });
  });

  it("marks the connection broken when Google withdraws access", async () => {
    tokenReply = { status: 400, body: { error: "invalid_grant" } };
    const r = await runInboxCheck(60_000);
    expect(r).toMatchObject({ status: "done", summary: { error: expect.stringMatching(/withdrew access/) } });
    const conn = await (await getPlatformDriveConnectionModel()).findOne({ key: "inbox" }).lean();
    expect(conn).toMatchObject({ status: "broken", lastError: expect.stringMatching(/Connect the account again/) });
    // A temporary failure doesn't break it
    await (await getPlatformDriveConnectionModel()).updateOne({ key: "inbox" }, { $set: { status: "ok" } });
    tokenReply = { status: 500, body: { error: "backend" } };
    await runInboxCheck(60_000);
    expect((await (await getPlatformDriveConnectionModel()).findOne({ key: "inbox" }).lean())?.status).toBe("ok");
  });

  it("keeps the encrypted token readable only through the app's key", () => {
    expect(decryptSensitiveData(encryptSensitiveData("x"))).toBe("x");
  });
});
