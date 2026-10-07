import { describe, expect, it } from "vitest";
import { assessCapability, offlinePdfMaxBytes } from "@/lib/deviceCapability";

const MB = 1024 * 1024;

describe("offlinePdfMaxBytes (largest PDF a device may save offline)", () => {
  it("follows the device's RAM", () => {
    expect(offlinePdfMaxBytes(1)).toBe(60 * MB);
    expect(offlinePdfMaxBytes(2)).toBe(60 * MB);
    expect(offlinePdfMaxBytes(4)).toBe(150 * MB);
    expect(offlinePdfMaxBytes(8)).toBe(300 * MB);
  });

  it("assumes a middling device when the browser doesn't say", () => {
    expect(offlinePdfMaxBytes(undefined)).toBe(150 * MB);
  });
});

describe("assessCapability", () => {
  const base = { ram: undefined, cores: 4, effectiveType: "4g", saveData: false };

  it("treats data saver and 2G as low whatever the hardware", () => {
    expect(assessCapability({ ...base, ram: 8, cores: 8, saveData: true })).toBe("low");
    expect(assessCapability({ ...base, ram: 8, cores: 8, effectiveType: "2g" })).toBe("low");
  });

  it("uses RAM where the browser reports it, else core count", () => {
    expect(assessCapability({ ...base, ram: 1 })).toBe("low");
    expect(assessCapability({ ...base, ram: 4, cores: 4 })).toBe("high");
    expect(assessCapability({ ...base, ram: 2 })).toBe("medium");
    expect(assessCapability({ ...base, cores: 2 })).toBe("low");
    expect(assessCapability({ ...base, cores: 8 })).toBe("high");
  });
});
