import { describe, expect, it } from "vitest";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";

const UNIZIK = "Nnamdi Azikiwe University, Awka";
const UNN = "University of Nigeria, Nsukka";

describe("checkSchoolEmail", () => {
  it.each([
    ["chu.fidelis@stu.unizik.edu.ng", UNIZIK],
    ["john.doe@unn.edu.ng", UNN],
    ["jdoe@student.oauife.edu.ng", "Obafemi Awolowo University, Ile-Ife"],
    ["x@live.unilag.edu.ng", "University of Lagos, Lagos"],
    ["  X.Y@STU.UNIZIK.EDU.NG ", UNIZIK],
  ])("accepts %s for its school", (email, school) => {
    expect(checkSchoolEmail(email, school)).toEqual({ ok: true, email: email.trim().toLowerCase() });
  });

  it.each([
    ["x@gmail.com", UNN],
    ["x@unizik.edu.ng", UNN],
    ["unn@gmail.com", UNN],
    ["x@unn.edu.ng.evil.com", UNN],
    ["x@unnedu.ng", UNN],
  ])("refuses %s for %s", (email, school) => {
    expect(checkSchoolEmail(email, school)).toEqual({ ok: false, reason: "mismatch" });
  });

  it("checks a catalog school by its own abbreviation and website", () => {
    const school = { name: "Testland University", abbreviation: "TLU", website: "https://www.testland.edu.ng" };
    expect(checkSchoolEmail("a@stu.testland.edu.ng", school).ok).toBe(true);
    expect(checkSchoolEmail("a@tlu.edu.ng", school).ok).toBe(true);
    expect(checkSchoolEmail("a@testland.com", school).ok).toBe(false);
  });

  it("explains invalid addresses and unknown schools", () => {
    expect(checkSchoolEmail("not-an-email", UNN)).toEqual({ ok: false, reason: "invalid" });
    const unknown = checkSchoolEmail("x@unn.edu.ng", "Made Up University");
    expect(unknown).toEqual({ ok: false, reason: "unknown_school" });
    if (!unknown.ok) expect(schoolEmailError(unknown, "Made Up University")).toBeTruthy();
  });
});
