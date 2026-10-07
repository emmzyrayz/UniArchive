// The Drive import pipeline (lib/drive/importFile.ts) against a fake Drive
// API, with storage, Cloudinary and badge awards mocked in-process.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { Types } from "mongoose";

const stored = new Map<string, Buffer>();
vi.mock("@/lib/storage", () => ({
  storageClient: {
    getPublicUrl: (key: string) => `https://b2.test/${key}`,
    generateUniqueFileName: (name: string) => `${name.replace(/\.pdf$/i, "")}_${crypto.randomUUID().slice(0, 8)}.pdf`,
    uploadFile: async (bytes: Uint8Array, key: string) => {
      stored.set(key, Buffer.from(bytes));
      return { success: true };
    },
    uploadStream: async (body: AsyncIterable<Buffer>, key: string) => {
      const parts: Buffer[] = [];
      for await (const chunk of body) parts.push(chunk);
      stored.set(key, Buffer.concat(parts));
      return { success: true };
    },
    deleteFile: async (key: string) => {
      stored.delete(key);
      return { success: true };
    },
  },
}));
const cloudinaryUploads: string[] = [];
let cloudinaryDown = false;
vi.mock("@/lib/cloudinary", () => ({
  uploadPdfFromServer: async (bytes: Uint8Array, publicId: string) => {
    if (cloudinaryDown) throw new Error("quota");
    cloudinaryUploads.push(publicId);
    return { publicId, secureUrl: `https://cloudinary.test/${publicId}.pdf`, bytes: bytes.byteLength, format: "pdf", pageCount: 2 };
  },
}));
vi.mock("@/lib/badges", () => ({ awardBadgesAfter: vi.fn() }));

const { importDriveFile, BUFFER_MAX_BYTES } = await import("@/lib/drive/importFile");
const { getBookModel } = await import("@/lib/models/bookModel");
const { getDriveImportModel } = await import("@/lib/models/driveImportModel");
const { getMaterialModel } = await import("@/lib/models/materialModel");
const { decryptSensitiveData } = await import("@/lib/encryption");

// --- Fake Drive -----------------------------------------------------------------
const pdf = (text: string, pad = 0) => Buffer.concat([Buffer.from(`%PDF-1.4\n% ${text}\n`), Buffer.alloc(pad, 32)]);
type FakeFile = { name: string; mimeType: string; bytes: Buffer; md5?: string };
const files = new Map<string, FakeFile>();
let downloads = 0;
function addFile(id: string, name: string, bytes: Buffer, mimeType = "application/pdf") {
  files.set(id, { name, mimeType, bytes, md5: crypto.createHash("md5").update(bytes).digest("hex") });
}
function fakeDrive(input: string | URL | Request): Promise<Response> {
  const url = new URL(String(input));
  const m = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
  const f = m && files.get(decodeURIComponent(m[1]));
  if (!f) return Promise.resolve(new Response(JSON.stringify({ error: { errors: [{ reason: "notFound" }] } }), { status: 404 }));
  if (url.searchParams.get("alt") === "media") {
    downloads++;
    return Promise.resolve(new Response(new Uint8Array(f.bytes), { status: 200 }));
  }
  return Promise.resolve(
    new Response(
      JSON.stringify({ id: m![1], name: f.name, mimeType: f.mimeType, size: String(f.bytes.length), md5Checksum: f.md5 }),
      { status: 200 },
    ),
  );
}

const student = { userId: String(new Types.ObjectId()), upid: "ada" };
const staff = { userId: String(new Types.ObjectId()), upid: "grace" };
const auth = { apiKey: "test-key" };
const library = { kind: "library" as const, owner: student };
const platform = { kind: "platform" as const, uploader: staff, source: "drive" as const };

beforeAll(async () => {
  process.env.DRIVE_API_URL = "https://drive.test/drive/v3";
  vi.stubGlobal("fetch", vi.fn(fakeDrive));
  const [Book, DriveImport, Material] = await Promise.all([getBookModel(), getDriveImportModel(), getMaterialModel()]);
  await Promise.all([Book.init(), DriveImport.init(), Material.init()]);
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  downloads = 0;
  cloudinaryDown = false;
});

describe("importDriveFile: library", () => {
  it("imports a small PDF to Cloudinary with its checksum and page count", async () => {
    addFile("small1", "MTH101_2023.pdf", pdf("small one"));
    const r = await importDriveFile(library, { fileId: "small1" }, auth, "link");
    expect(r).toMatchObject({ status: "imported", name: "MTH101_2023.pdf" });
    const book = await (await getBookModel()).findById(r.bookId).lean();
    expect(book).toMatchObject({
      title: "MTH101 2023",
      storageProvider: "cloudinary",
      uploaderId: new Types.ObjectId(student.userId),
      ownerUpid: "ada",
      pageCount: 2,
      checksum: crypto.createHash("sha256").update(pdf("small one")).digest("hex"),
      visibility: "private",
    });
    expect(book?.platform).toBeUndefined();
    expect(cloudinaryUploads.at(-1)).toMatch(new RegExp(`^uniarchive/books/${student.userId}/`));
  });

  it("skips the same Drive file without downloading it again", async () => {
    const r = await importDriveFile(library, { fileId: "small1" }, auth, "link");
    expect(r).toMatchObject({ status: "duplicate", message: "Already imported." });
    expect(downloads).toBe(0);
  });

  it("skips the same bytes from another Drive file (checksum)", async () => {
    addFile("small1-copy", "copy.pdf", pdf("small one"));
    const r = await importDriveFile(library, { fileId: "small1-copy" }, auth, "picker");
    expect(r).toMatchObject({ status: "duplicate", message: "You already have this PDF." });
    expect(downloads).toBe(1);
  });

  it("imports again once the earlier book was deleted", async () => {
    addFile("again", "again.pdf", pdf("again"));
    const first = await importDriveFile(library, { fileId: "again" }, auth, "link");
    await (await getBookModel()).deleteOne({ _id: first.bookId });
    const second = await importDriveFile(library, { fileId: "again" }, auth, "link");
    expect(second.status).toBe("imported");
  });

  it("falls back to Backblaze when Cloudinary refuses a small file", async () => {
    cloudinaryDown = true;
    addFile("fallback", "fallback.pdf", pdf("fallback"));
    const r = await importDriveFile(library, { fileId: "fallback" }, auth, "link");
    const book = await (await getBookModel()).findById(r.bookId).lean();
    expect(book).toMatchObject({ storageProvider: "backblaze" });
    expect(book?.storageKey).toMatch(new RegExp(`^books/${student.userId}/`));
    expect(book?.pdfJob?.compress).toBe(false);
    expect(stored.has(book!.storageKey)).toBe(true);
  });

  it("streams a large PDF to Backblaze", async () => {
    addFile("big", "Big textbook.pdf", pdf("big", BUFFER_MAX_BYTES + 1024));
    const r = await importDriveFile(library, { fileId: "big" }, auth, "link");
    expect(r.status).toBe("imported");
    const book = await (await getBookModel()).findById(r.bookId).lean();
    expect(book).toMatchObject({ storageProvider: "backblaze", fileSize: BUFFER_MAX_BYTES + 1024 + pdf("big").length });
    expect(book?.checksum).toBe(crypto.createHash("sha256").update(files.get("big")!.bytes).digest("hex"));
    expect(stored.get(book!.storageKey)?.length).toBe(book!.fileSize);
  });

  it("deletes a streamed upload that turns out to be a duplicate", async () => {
    addFile("big-copy", "Big copy.pdf", files.get("big")!.bytes);
    const before = stored.size;
    const r = await importDriveFile(library, { fileId: "big-copy" }, auth, "link");
    expect(r.status).toBe("duplicate");
    expect(stored.size).toBe(before);
  });

  it.each([
    ["a Google Doc", "doc1", "Notes", Buffer.from("x"), "application/vnd.google-apps.document", /isn't a PDF/],
    ["fake PDF bytes", "fake1", "fake.pdf", Buffer.from("<html>not a pdf</html>"), "application/pdf", /contents don't match/],
  ])("refuses %s", async (_, id, name, bytes, mime, message) => {
    addFile(id, name, bytes, mime);
    const r = await importDriveFile(library, { fileId: id }, auth, "link");
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(message);
  });

  it("explains a private or missing file", async () => {
    const r = await importDriveFile(library, { fileId: "nope-not-shared" }, auth, "link");
    expect(r).toMatchObject({ status: "failed" });
    expect(r.message).toMatch(/Anyone with the link/);
  });

  it("logs every attempt", async () => {
    const rows = await (await getDriveImportModel()).find({ owner: student.userId }).lean();
    expect(rows.map((r) => r.status).sort()).toEqual(
      ["duplicate", "duplicate", "duplicate", "failed", "failed", "failed", "imported", "imported", "imported", "imported", "imported"],
    );
  });
});

describe("importDriveFile: platform queue", () => {
  it("queues a staff import as an unidentified PDF", async () => {
    addFile("plat1", "CHM 102 notes.pdf", pdf("platform one"));
    const r = await importDriveFile(platform, { fileId: "plat1" }, auth, "picker");
    expect(r.status).toBe("imported");
    const book = await (await getBookModel()).findById(r.bookId).lean();
    expect(book?.platform).toMatchObject({ source: "drive", status: "pending", uploadedByUpid: "grace", drive: { fileId: "plat1" } });
    expect(book?.storageKey).toMatch(new RegExp(`^platform/${staff.userId}/`));
    expect(book?.pdfJob?.compress).toBe(true);
    const material = await (await getMaterialModel()).findOne({ bookId: book!._id }).lean();
    expect(material).toMatchObject({ status: "unverified", source: "platform" });
  });

  it("skips what the queue already has, even from the library's copy of the bytes", async () => {
    addFile("plat1-copy", "copy.pdf", pdf("platform one"));
    expect((await importDriveFile(platform, { fileId: "plat1-copy" }, auth, "link")).status).toBe("duplicate");
    // The library and the queue are separate: a student's copy doesn't block staff
    expect((await importDriveFile(platform, { fileId: "small1" }, auth, "link")).status).toBe("imported");
  });

  it("records who shared an inbox file, email encrypted", async () => {
    addFile("inbox1", "shared.pdf", pdf("inbox"));
    const r = await importDriveFile(
      { kind: "platform", uploader: staff, source: "drive_inbox", sharedBy: { name: "Chi", email: "Chi@Example.com" } },
      { fileId: "inbox1" },
      { accessToken: "token" },
      "inbox",
    );
    const book = await (await getBookModel()).findById(r.bookId).lean();
    expect(book?.storageKey).toMatch(/^platform\/inbox\//);
    expect(book?.platform?.drive?.sharedByName).toBe("Chi");
    expect(decryptSensitiveData(book!.platform!.drive!.sharedByEmail!)).toBe("chi@example.com");
    const row = await (await getDriveImportModel()).findOne({ driveFileId: "inbox1" }).lean();
    expect(row).toMatchObject({ owner: "platform", via: "inbox", sharedByName: "Chi" });
  });
});
