import { describe, expect, it } from "vitest";
import { parseDriveUrl } from "@/lib/drive/urls";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-012";

describe("parseDriveUrl", () => {
  it.each([
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, { kind: "folder", id: ID }],
    [`https://drive.google.com/drive/u/1/folders/${ID}`, { kind: "folder", id: ID }],
    [`drive.google.com/drive/mobile/folders/${ID}`, { kind: "folder", id: ID }],
    [`https://drive.google.com/file/d/${ID}/view?usp=drive_link`, { kind: "file", id: ID }],
    [`https://drive.google.com/file/u/0/d/${ID}/view`, { kind: "file", id: ID }],
    [`https://docs.google.com/file/d/${ID}/edit`, { kind: "file", id: ID }],
    [`https://drive.google.com/uc?id=${ID}&export=download`, { kind: "file", id: ID }],
    [`https://drive.google.com/open?id=${ID}`, { kind: "any", id: ID }],
    [`  ${ID}  `, { kind: "any", id: ID }],
  ])("reads %s", (input, expected) => {
    expect(parseDriveUrl(input)).toEqual(expected);
  });

  it("keeps the resource key older shared links need", () => {
    expect(parseDriveUrl(`https://drive.google.com/drive/folders/${ID}?resourcekey=0-abcDEF`)).toEqual({
      kind: "folder",
      id: ID,
      resourceKey: "0-abcDEF",
    });
  });

  it.each([
    "",
    "hello",
    "https://example.com/drive/folders/" + ID,
    "https://drive.google.com.evil.com/drive/folders/" + ID,
    "https://drive.google.com/drive/my-drive",
    "https://drive.google.com/file/d/short/view",
    "javascript:alert(1)",
  ])("rejects %j", (input) => {
    expect(parseDriveUrl(input)).toBeNull();
  });
});
