// Who a broadcast reaches (lib/broadcast/recipients.ts): the one resolver
// behind both the admin's count and the send.
import { beforeAll, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { resolveRecipients } from "@/lib/broadcast/recipients";
import { EMPTY_AUDIENCE, type BroadcastAudience } from "@/lib/broadcast/audience";
import { getUserModel } from "@/lib/models/userModel";
import { getLoginEventModel } from "@/lib/models/loginEventModel";

const DEPT = new Types.ObjectId();
const complete = {
  phone: "x",
  profilePhoto: "https://x.test/p.jpg",
  bio: "Hi",
  fullName: "Ada Obi",
  username: "ada",
  dob: new Date("2004-01-01"),
  universityId: new Types.ObjectId(),
  facultyId: new Types.ObjectId(),
  departmentId: DEPT,
  level: "100L",
};

const users = [
  { upid: "ada", universityName: "UNN", ...complete },
  { upid: "bola", universityName: "UNN", emailPrefs: { newsletter: true } },
  { upid: "chi", school: "UNIZIK", verifiedMaterialCount: 2, role: "collaborator" },
  { upid: "dayo", universityName: "UNIZIK", emailPrefs: { announcements: false } },
  { upid: "eze", isVerified: false },
  { upid: "femi", isSuspended: true },
  { upid: "gozie", schoolEmailVerifiedAt: new Date(), createdAt: new Date("2026-01-15T10:00:00Z") },
  { upid: "hauwa", deletion: { requestedAt: new Date(), purgeAfter: new Date() } },
];

beforeAll(async () => {
  const User = await getUserModel();
  await User.collection.insertMany(
    users.map((u, i) => ({
      _id: new Types.ObjectId(),
      email: `enc-${u.upid}`,
      emailHash: `hash-${u.upid}`,
      uuid: `uuid-${u.upid}`,
      firstName: u.upid,
      role: "student",
      isVerified: true,
      createdAt: new Date(Date.UTC(2026, 5, i + 1)),
      ...u,
    })),
  );
  const gozie = await User.collection.findOne({ upid: "gozie" });
  const LoginEvent = await getLoginEventModel();
  await LoginEvent.collection.insertOne({ userId: gozie!._id, createdAt: new Date(), method: "password" });
});

const who = async (audience: Partial<BroadcastAudience>, kind: "announcements" | "newsletter" = "announcements") =>
  (await resolveRecipients({ ...EMPTY_AUDIENCE, ...audience }, kind)).map((r) => r.upid).sort();

describe("resolveRecipients", () => {
  it("always skips unverified, suspended, deleting and opted-out accounts", async () => {
    expect(await who({})).toEqual(["ada", "bola", "chi", "gozie"]);
  });

  it("sends the newsletter only to people who opted in", async () => {
    expect(await who({}, "newsletter")).toEqual(["bola"]);
  });

  it("stacks criteria", async () => {
    expect(await who({ schools: ["UNN"] })).toEqual(["ada", "bola"]);
    expect(await who({ schools: ["UNIZIK"] })).toEqual(["chi"]);
    expect(await who({ schools: ["UNN"], levels: ["100L"] })).toEqual(["ada"]);
    expect(await who({ departmentIds: [String(DEPT)] })).toEqual(["ada"]);
    expect(await who({ roles: ["collaborator"] })).toEqual(["chi"]);
    expect(await who({ contributorsOnly: true })).toEqual(["chi"]);
    expect(await who({ verifiedStudentsOnly: true })).toEqual(["gozie"]);
    expect(await who({ joinedFrom: "2026-01-01", joinedTo: "2026-01-31" })).toEqual(["gozie"]);
  });

  it("finds incomplete profiles and the inactive", async () => {
    expect(await who({ incompleteProfileOnly: true })).toEqual(["bola", "chi", "gozie"]);
    expect(await who({ inactiveDays: 30 })).toEqual(["ada", "bola", "chi"]);
  });
});
