// The life of a UniLibrary Material (lib/materialPublish.ts): listed
// unverified on submission, verified in place, removed on rejection.
import { beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  removeUnverifiedMaterial,
  upsertUnverifiedFromPlatformBook,
  upsertUnverifiedFromSubmission,
  verifyMaterialRecord,
  type PublishableBook,
} from "@/lib/materialPublish";
import { getMaterialModel, VERIFIED_MATERIALS, COMMUNITY_MATERIALS } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import type { IMaterialSubmission } from "@/lib/models/materialSubmissionModel";

const book: PublishableBook = { storageProvider: "backblaze", storageKey: "pdfs/a.pdf", fileSize: 1234, pageCount: 10 } as PublishableBook;
const student = { userId: new Types.ObjectId(), upid: "ada" };
const verifier = { userId: String(new Types.ObjectId()), upid: "grace" };

function submission(extra: Partial<IMaterialSubmission> = {}): IMaterialSubmission {
  return {
    _id: new Types.ObjectId(),
    bookId: new Types.ObjectId(),
    submittedBy: student.userId,
    submittedByUpid: student.upid,
    title: "MTH101 past questions 2024",
    description: "First semester exam",
    category: "EXAMS",
    tags: [],
    language: "en",
    courseCode: "MTH101",
    universityName: "University of Nigeria, Nsukka",
    level: "100",
    ...extra,
  } as unknown as IMaterialSubmission;
}

let Material: Awaited<ReturnType<typeof getMaterialModel>>;
beforeEach(async () => {
  Material = await getMaterialModel();
  await Material.init();
  await Material.deleteMany({});
});

describe("material lifecycle", () => {
  it("lists a submission at once as unverified, outside community counts", async () => {
    const s = submission();
    await upsertUnverifiedFromSubmission(s, book);
    const m = await Material.findOne({ bookId: s.bookId }).lean();
    expect(m).toMatchObject({ status: "unverified", title: s.title, courseCode: "MTH101", source: "community", isActive: true });
    expect(await Material.countDocuments(VERIFIED_MATERIALS)).toBe(0);
    expect(await Material.countDocuments(COMMUNITY_MATERIALS)).toBe(0);
  });

  it("refreshes the unverified listing when the submission is edited, clearing removed details", async () => {
    const s = submission();
    await upsertUnverifiedFromSubmission(s, book);
    await upsertUnverifiedFromSubmission({ ...s, title: "Fixed title", courseCode: undefined } as IMaterialSubmission, book);
    expect(await Material.countDocuments({ bookId: s.bookId })).toBe(1);
    const m = await Material.findOne({ bookId: s.bookId }).lean();
    expect(m?.title).toBe("Fixed title");
    expect(m?.courseCode).toBeUndefined();
  });

  it("verifies the same record in place, and a later re-listing never un-verifies it", async () => {
    const s = submission();
    await upsertUnverifiedFromSubmission(s, book);
    const before = await Material.findOne({ bookId: s.bookId }).lean();
    const verified = await verifyMaterialRecord(s, book, verifier, { source: "community", verifiedAt: new Date() });
    expect(String(verified._id)).toBe(String(before!._id));
    expect(verified).toMatchObject({ status: "verified", verificationTier: "tier1", tier1VerifiedByUpid: "grace" });

    await upsertUnverifiedFromSubmission({ ...s, title: "Late edit" } as IMaterialSubmission, book);
    const after = await Material.findOne({ bookId: s.bookId }).lean();
    expect(after).toMatchObject({ status: "verified", title: s.title });
    expect(await Material.countDocuments(COMMUNITY_MATERIALS)).toBe(1);
  });

  it("creates a verified record for a PDF that was never listed", async () => {
    const s = submission();
    await verifyMaterialRecord(s, book, verifier, { source: "community", verifiedAt: new Date() });
    expect(await Material.countDocuments({ bookId: s.bookId, status: "verified" })).toBe(1);
  });

  it("lists a bulk upload as an unidentified platform PDF", async () => {
    const id = new Types.ObjectId();
    await upsertUnverifiedFromPlatformBook({
      ...book,
      _id: id,
      title: "scan_0042.pdf",
      description: "",
      platform: { source: "bulk", uploadedBy: student.userId, uploadedByUpid: "staff" },
    } as unknown as Parameters<typeof upsertUnverifiedFromPlatformBook>[0]);
    const m = await Material.findOne({ bookId: id }).lean();
    expect(m).toMatchObject({ status: "unverified", source: "platform", title: "scan_0042.pdf" });
    expect(m?.category).toBeUndefined();
  });

  it("removes a rejected PDF with its suggestions, but only hides one people engaged with", async () => {
    const Suggestion = await getMaterialSuggestionModel();
    const plain = submission();
    await upsertUnverifiedFromSubmission(plain, book);
    const m = await Material.findOne({ bookId: plain.bookId }).lean();
    await Suggestion.collection.insertOne({ materialId: m!._id, userId: new Types.ObjectId(), status: "pending" });
    expect(await removeUnverifiedMaterial(plain.bookId)).toBe("deleted");
    expect(await Material.countDocuments({ bookId: plain.bookId })).toBe(0);
    expect(await Suggestion.countDocuments({ materialId: m!._id })).toBe(0);

    const discussed = submission();
    await upsertUnverifiedFromSubmission(discussed, book);
    await Material.updateOne({ bookId: discussed.bookId }, { $set: { commentCount: 2 } });
    expect(await removeUnverifiedMaterial(discussed.bookId)).toBe("hidden");
    expect(await Material.findOne({ bookId: discussed.bookId }).lean()).toMatchObject({ isActive: false });
  });

  it("never removes a verified material", async () => {
    const s = submission();
    await verifyMaterialRecord(s, book, verifier, { source: "community", verifiedAt: new Date() });
    expect(await removeUnverifiedMaterial(s.bookId)).toBe("none");
    expect(await Material.countDocuments({ bookId: s.bookId })).toBe(1);
  });
});
