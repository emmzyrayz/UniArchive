import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { canWorkOn, queueFilter } from "@/lib/platformUploads";
import type { SessionUser } from "@/lib/auth/session";

const user = (role: string, id = String(new Types.ObjectId())) => ({ userId: id, upid: "x", role }) as unknown as SessionUser;
const mod = user("auditor");
const admin = user("com_admin");
const student = user("student");

describe("queueFilter", () => {
  it("counts staff Drive imports as the staff member's own uploads", () => {
    expect(queueFilter(mod, "mine", "pending")).toEqual({
      "platform.status": "pending",
      "platform.source": { $in: ["mod_upload", "drive"] },
      "platform.uploadedBy": mod.userId,
    });
    expect(queueFilter(admin, "all", "pending")).toMatchObject({ "platform.source": { $in: ["mod_upload", "drive"] } });
    expect(queueFilter(mod, "all", "pending")).toBeNull();
  });

  it("shows the Drive inbox to all staff, nobody else", () => {
    expect(queueFilter(mod, "inbox", "pending")).toEqual({ "platform.status": "pending", "platform.source": "drive_inbox" });
    expect(queueFilter(student, "inbox", "pending")).toBeNull();
  });
});

describe("canWorkOn", () => {
  const other = new Types.ObjectId();
  it("lets any staff member work on inbox files", () => {
    expect(canWorkOn(mod, { source: "drive_inbox", uploadedBy: other })).toBe(true);
    expect(canWorkOn(student, { source: "drive_inbox", uploadedBy: other })).toBe(false);
  });

  it("keeps staff uploads and Drive imports to their uploader and admins", () => {
    expect(canWorkOn(mod, { source: "drive", uploadedBy: other })).toBe(false);
    expect(canWorkOn(mod, { source: "drive", uploadedBy: new Types.ObjectId(mod.userId) })).toBe(true);
    expect(canWorkOn(admin, { source: "mod_upload", uploadedBy: other })).toBe(true);
  });

  it("keeps gifts to admins who review them", () => {
    expect(canWorkOn(mod, { source: "gift", uploadedBy: other })).toBe(false);
    expect(canWorkOn(admin, { source: "gift", uploadedBy: other })).toBe(true);
  });
});
