import { describe, expect, it } from "vitest";
import {
  BROADCAST_TEMPLATES,
  broadcastKind,
  cleanFields,
  getTemplate,
  initialFields,
  isHttpsUrl,
  personalize,
  renderBroadcast,
} from "@/lib/broadcast/templates";
import { monthRange } from "@/lib/broadcast/digestStats";
import { KEEP_DAYS, ORPHAN_HOURS, listDue } from "@/lib/broadcast/tidyLists";

const announcement = getTemplate("general_announcement")!;

describe("templates", () => {
  it.each(BROADCAST_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s renders with its initial fields and carries the unsubscribe tags",
    (_, t) => {
      const r = renderBroadcast(t, initialFields(t), broadcastKind(t));
      expect(r.subject.length).toBeGreaterThan(0);
      expect(r.html).toContain("{{ unsubscribe }}");
      expect(r.html).toContain("{{ contact.PREFS_URL }}");
      expect(r.text).toContain("Unsubscribe: {{ unsubscribe }}");
    },
  );

  it("escapes every value: no HTML from the author reaches the email", () => {
    const { fields } = cleanFields(announcement, {
      headline: "<script>alert(1)</script>",
      body: 'Hi <img src=x onerror="alert(1)">',
      bullets: ["<b>bold</b>"],
    });
    const { html } = renderBroadcast(announcement, fields, "announcements");
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&#60;script&#62;alert(1)");
  });

  it("only allows https links (http just for localhost)", () => {
    expect(isHttpsUrl("https://uniarchive.com.ng/x")).toBe(true);
    expect(isHttpsUrl("http://localhost:3000/x")).toBe(true);
    expect(isHttpsUrl("http://uniarchive.com.ng")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    const { problems } = cleanFields(announcement, { headline: "H", body: "B", ctaLabel: "Go", ctaUrl: "javascript:alert(1)" });
    expect(problems).toContain("Button link must be an https:// link.");
  });

  it("drops unknown fields and needs both halves of a button", () => {
    const { fields, problems } = cleanFields(announcement, { headline: "H", body: "B", ctaLabel: "Go", evil: "<x>" });
    expect(fields).not.toHaveProperty("evil");
    expect(problems).toContain("A button needs both its text and its link.");
  });

  it("keeps only well-formed, unique picked materials", () => {
    const digest = getTemplate("monthly_digest")!;
    const id = "a".repeat(24);
    const { fields } = cleanFields(digest, {
      materials: [{ id, title: "T" }, { id, title: "dupe" }, { id: "bad", title: "x" }, { id: "b".repeat(24) }],
    });
    expect(fields.materials).toEqual([{ id, title: "T" }]);
  });

  it("digest shows numbered lines as big numbers, and the month in the subject", () => {
    const digest = getTemplate("monthly_digest")!;
    const { fields, problems } = cleanFields(digest, {
      ...initialFields(digest),
      month: "September 2026",
      stats: ["152 new materials", "Lots of reading"],
    });
    expect(problems).toEqual([]);
    const r = renderBroadcast(digest, fields, "newsletter");
    expect(r.subject).toBe("Your month on UniArchive: September 2026");
    expect(r.html).toMatch(/>152<\/div>/);
    expect(r.html).toContain("new materials");
    expect(r.html).toContain("Lots of reading");
  });

  it("the profile nudge starts with incomplete profiles", () => {
    expect(getTemplate("profile_nudge")!.audience).toEqual({ incompleteProfileOnly: true });
  });

  it("personalize fills merge tags, escaping the name in HTML", () => {
    const rendered = renderBroadcast(announcement, cleanFields(announcement, { headline: "H", body: "B" }).fields, "announcements");
    const r = personalize(rendered, { firstName: "<Ada>", prefsUrl: "https://x.test/p", unsubscribeUrl: "https://x.test/u" });
    expect(r.html).toContain("Hi &#60;Ada&#62;,");
    expect(r.text).toContain("Hi <Ada>,");
    expect(r.html).not.toContain("{{");
  });
});

describe("monthRange (Lagos calendar month)", () => {
  it("starts and ends at Lagos midnight (UTC+1)", () => {
    const r = monthRange("2026-09")!;
    expect(r.start.toISOString()).toBe("2026-08-31T23:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    expect(r.label).toBe("September 2026");
    expect(monthRange("2026-12")!.end.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it.each(["", "2026-13", "2026-9", "26-09", "abc"])("rejects %j", (m) => {
    expect(monthRange(m)).toBeNull();
  });
});

describe("listDue (tidying Brevo lists)", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const id = "6ac66893c8f9d4db89dfb422";
  const name = (stamp: string) => `UA broadcast ${id} (${stamp})`;
  const daysAgo = (d: number) => new Date(now - d * 864e5);

  it("deletes a sent broadcast's list after KEEP_DAYS", () => {
    const list = { id: 7, name: name("2026-08-01 10:00") };
    expect(listDue(list, { status: "sent", brevoListId: 7, sentAt: daysAgo(KEEP_DAYS + 1), updatedAt: daysAgo(1) }, now)).not.toBeNull();
    expect(listDue(list, { status: "sent", brevoListId: 7, sentAt: daysAgo(KEEP_DAYS - 1), updatedAt: daysAgo(1) }, now)).toBeNull();
  });

  it("never touches scheduled or sending broadcasts", () => {
    const list = { id: 7, name: name("2026-01-01 10:00") };
    for (const status of ["scheduled", "sending"] as const) {
      expect(listDue(list, { status, brevoListId: 7, updatedAt: daysAgo(200) }, now)).toBeNull();
    }
  });

  it("deletes leftovers after ORPHAN_HOURS, not before", () => {
    const old = { id: 8, name: name("2026-10-05 10:00") };
    const recent = new Date(now - (ORPHAN_HOURS - 1) * 3600e3).toISOString().slice(0, 16).replace("T", " ");
    expect(listDue(old, null, now)?.reason).toBe("no broadcast");
    expect(listDue(old, { status: "draft", updatedAt: daysAgo(1) }, now)?.reason).toBe("unused (send retried)");
    expect(listDue({ id: 9, name: name(recent) }, null, now)).toBeNull();
  });

  it("ignores lists it didn't name", () => {
    expect(listDue({ id: 1, name: "Webinar guests" }, null, now)).toBeNull();
    expect(listDue({ id: 1, name: `UA broadcast ${id}` }, null, now)).toBeNull();
  });
});
