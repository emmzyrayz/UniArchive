import { describe, expect, it } from "vitest";
import { isSafeNotificationLink, NOTIFICATION_KINDS, NOTIFICATION_TYPES } from "@/lib/notificationTypes";
import { timeAgo } from "@/components/notifications/notificationClient";

describe("notification links", () => {
  it("accepts site paths only", () => {
    expect(isSafeNotificationLink("/materials/abc")).toBe(true);
    expect(isSafeNotificationLink("/dashboard?tab=conversions")).toBe(true);
    for (const bad of ["https://x.com", "//x.com", "/" + String.fromCharCode(92) + "x.com", "javascript:alert(1)", "materials", "/a b", "", 5, null]) {
      expect(isSafeNotificationLink(bad)).toBe(false);
    }
    expect(isSafeNotificationLink(`/${"a".repeat(300)}`)).toBe(false);
  });

  it("has an icon for every type", () => {
    for (const t of NOTIFICATION_TYPES) expect(NOTIFICATION_KINDS[t].icon).toBeTruthy();
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const ago = (s: number) => new Date(now - s * 1000).toISOString();
  it("reads naturally", () => {
    expect(timeAgo(ago(20), now)).toBe("just now");
    expect(timeAgo(ago(300), now)).toBe("5 minutes ago");
    expect(timeAgo(ago(7200), now)).toBe("2 hours ago");
    expect(timeAgo(ago(86_400), now)).toBe("yesterday");
    expect(timeAgo(ago(10 * 86_400), now)).toBe("28 Sept 2026");
  });
});
