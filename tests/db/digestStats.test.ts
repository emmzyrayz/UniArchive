// The Monthly digest's numbers (lib/broadcast/digestStats.ts) for a Lagos
// calendar month.
import { beforeAll, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { digestStats } from "@/lib/broadcast/digestStats";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getUserModel } from "@/lib/models/userModel";

const SEP = (d: number) => new Date(Date.UTC(2026, 8, d, 12));
const UNI1 = new Types.ObjectId();
const UNI2 = new Types.ObjectId();
const ids: Record<string, Types.ObjectId> = {};

beforeAll(async () => {
  const mat = (title: string, extra: Record<string, unknown>) => {
    ids[title] = new Types.ObjectId();
    return { _id: ids[title], title, category: "EXAMS", isActive: true, viewCount: 0, createdAt: SEP(5), ...extra };
  };
  const Material = await getMaterialModel();
  await Material.collection.insertMany([
    mat("Top read", { status: "verified", tier1VerifiedAt: SEP(10), viewCount: 500, courseCode: "MTH101", universityAbbr: "UNN", universityId: UNI1 }),
    mat("Second", { status: "verified", tier1VerifiedAt: SEP(11), viewCount: 300, universityName: "Testland University", universityId: UNI2 }),
    mat("Third", { status: "verified", tier1VerifiedAt: SEP(12), viewCount: 200, universityId: UNI1 }),
    mat("Fourth", { status: "verified", tier1VerifiedAt: SEP(13), viewCount: 100 }),
    mat("Fifth", { status: "verified", tier1VerifiedAt: SEP(14), viewCount: 50 }),
    mat("Inactive", { status: "verified", tier1VerifiedAt: SEP(15), viewCount: 9999, isActive: false }),
    mat("Unverified", { status: "unverified", viewCount: 9000, universityId: UNI2 }),
    // 23:30 UTC on Aug 31 is Sept 1 in Lagos; 23:30 UTC on Sept 30 is Oct 1
    mat("Edge in", { status: "verified", tier1VerifiedAt: new Date("2026-08-31T23:30:00Z"), createdAt: new Date("2026-08-31T23:30:00Z"), viewCount: 1 }),
    mat("Edge out", { status: "verified", tier1VerifiedAt: new Date("2026-09-30T23:30:00Z"), createdAt: new Date("2026-09-30T23:30:00Z"), viewCount: 8000 }),
    mat("Old (no status field)", { tier1VerifiedAt: new Date("2026-03-01"), createdAt: new Date("2026-03-01"), viewCount: 7000 }),
  ]);
  const Question = await getTypedQuestionModel();
  await Question.collection.insertMany([SEP(1), SEP(2), SEP(3), new Date("2026-10-02")].map((createdAt) => ({ createdAt })));
  const Note = await getContentDocumentModel();
  await Note.collection.insertMany([{ isActive: true, createdAt: SEP(3) }, { isActive: false, createdAt: SEP(3) }]);
  const Suggestion = await getMaterialSuggestionModel();
  await Suggestion.collection.insertMany([
    { materialId: ids.Unverified, status: "accepted", decidedAt: SEP(20) },
    { materialId: ids.Unverified, status: "accepted", decidedAt: SEP(20) },
    { materialId: ids.Second, status: "declined", decidedAt: SEP(20) },
  ]);
  const User = await getUserModel();
  await User.collection.insertMany([
    { upid: "u1", emailHash: "h1", uuid: "uuid1", isVerified: true, createdAt: SEP(9) },
    { upid: "u2", emailHash: "h2", uuid: "uuid2", isVerified: false, createdAt: SEP(9) },
    { upid: "u3", emailHash: "h3", uuid: "uuid3", isVerified: true, createdAt: new Date("2026-10-03") },
  ]);
});

describe("digestStats", () => {
  it("counts the month", async () => {
    const r = await digestStats("2026-09");
    expect(r?.monthLabel).toBe("September 2026");
    expect(r?.counts).toEqual({
      verified: 6,
      shared: 7,
      typedQuestions: 3,
      typedNotes: 1,
      pdfsIdentified: 1,
      newMembers: 1,
      schools: 2,
      librarySize: 7,
    });
  });

  it("writes number-first lines with the right singular/plural", async () => {
    const r = await digestStats("2026-09");
    expect(r?.stats).toEqual([
      "6 new verified materials in the UniLibrary",
      "7 PDFs shared by students and staff",
      "3 past questions typed out",
      "1 set of typed notes",
      "1 PDF identified by readers",
      "1 new member",
      "2 schools with new materials",
      "7 verified materials in the library so far",
    ]);
  });

  it("picks the month's four most-read newly verified materials", async () => {
    const r = await digestStats("2026-09");
    expect(r?.materials).toEqual([
      { id: String(ids["Top read"]), title: "Top read", courseCode: "MTH101", school: "UNN" },
      { id: String(ids.Second), title: "Second", school: "Testland University" },
      { id: String(ids.Third), title: "Third" },
      { id: String(ids.Fourth), title: "Fourth" },
    ]);
  });

  it("leaves out empty lines and rejects bad months", async () => {
    expect(await digestStats("2020-01")).toMatchObject({ stats: [], materials: [] });
    expect(await digestStats("2026-13")).toBeNull();
  });
});
