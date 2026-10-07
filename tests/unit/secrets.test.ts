import { describe, expect, it } from "vitest";
import { decryptSensitiveData, encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { effectiveEmailPrefs, emailPrefsToken, emailPrefsUrl, isValidEmailPrefsToken } from "@/lib/emailPrefs";

describe("field encryption", () => {
  it("round-trips, with a fresh IV each time", () => {
    const a = encryptSensitiveData("ada@example.com");
    const b = encryptSensitiveData("ada@example.com");
    expect(a).not.toBe(b);
    expect(decryptSensitiveData(a)).toBe("ada@example.com");
  });

  it("hashes lookups the same way every time", () => {
    expect(hashForSearch("ada@example.com")).toBe(hashForSearch("ada@example.com"));
    expect(hashForSearch("ada@example.com")).not.toBe(hashForSearch("obi@example.com"));
  });
});

describe("email preferences", () => {
  it("defaults: announcements on, newsletter off", () => {
    expect(effectiveEmailPrefs(undefined)).toMatchObject({ announcements: true, newsletter: false });
    expect(effectiveEmailPrefs({ announcements: false })).toMatchObject({ announcements: false, newsletter: false });
  });

  it("signs the no-sign-in link per user", () => {
    const user = "6ac66893c8f9d4db89dfb422";
    const token = emailPrefsToken(user);
    expect(isValidEmailPrefsToken(user, token)).toBe(true);
    expect(isValidEmailPrefsToken("6ac66893c8f9d4db89dfb423", token)).toBe(false);
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(isValidEmailPrefsToken(user, tampered)).toBe(false);
    expect(isValidEmailPrefsToken(user, "not-hex")).toBe(false);
    expect(emailPrefsUrl({ _id: user, upid: "ada" })).toBe(`https://uniarchive.test/email-preferences?u=ada&t=${token}`);
  });
});
