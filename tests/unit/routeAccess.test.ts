import { describe, expect, it } from "vitest";
import {
  PUBLIC_PAGE_PATHS,
  canEnterStaffArea,
  isPublicMaterialPath,
  isPublicProfilePath,
  isPublicSurveyPath,
  modPathFor,
  staffAreaOf,
} from "@/lib/routeAccess";

describe("public pages", () => {
  it("lists the signed-out pages", () => {
    for (const p of ["/", "/unilibrary", "/privacy", "/email-preferences"]) expect(PUBLIC_PAGE_PATHS.has(p)).toBe(true);
    expect(PUBLIC_PAGE_PATHS.has("/dashboard")).toBe(false);
  });

  it("makes /profile/<upid> public but not the owner's pages", () => {
    expect(isPublicProfilePath("/profile/ada123")).toBe(true);
    expect(isPublicProfilePath("/profile/ada123/")).toBe(true);
    expect(isPublicProfilePath("/profile/edit")).toBe(false);
    expect(isPublicProfilePath("/profile")).toBe(false);
    expect(isPublicProfilePath("/profile/ada/settings")).toBe(false);
  });

  it("opens surveys and material pages, not their sub-pages", () => {
    expect(isPublicSurveyPath("/surveys")).toBe(true);
    expect(isPublicSurveyPath("/surveys/feedback-2026")).toBe(true);
    expect(isPublicSurveyPath("/surveys/x/results")).toBe(false);
    expect(isPublicMaterialPath("/materials/6ac47d685205683f54cd0f30")).toBe(true);
    expect(isPublicMaterialPath("/materials/6ac47d685205683f54cd0f30/outline")).toBe(false);
  });
});

describe("staff areas", () => {
  it("tells /admin from /mod (and not lookalikes)", () => {
    expect(staffAreaOf("/admin")).toBe("admin");
    expect(staffAreaOf("/admin/users")).toBe("admin");
    expect(staffAreaOf("/mod/submissions")).toBe("mod");
    expect(staffAreaOf("/administrator")).toBeNull();
    expect(staffAreaOf("/modules")).toBeNull();
  });

  it("lets moderators into /mod only, and admins into both", () => {
    expect(canEnterStaffArea("auditor", "mod")).toBe(true);
    expect(canEnterStaffArea("auditor", "admin")).toBe(false);
    expect(canEnterStaffArea("dev", "admin")).toBe(true);
    expect(canEnterStaffArea("dev", "mod")).toBe(true);
    expect(canEnterStaffArea("student", "mod")).toBe(false);
  });

  it("maps old /admin links to their /mod copy where one exists", () => {
    expect(modPathFor("/admin")).toBe("/mod");
    expect(modPathFor("/admin/submissions/abc")).toBe("/mod/submissions/abc");
    expect(modPathFor("/admin/users")).toBeNull();
    expect(modPathFor("/admin/mail")).toBeNull();
  });
});
