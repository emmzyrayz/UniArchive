// src/lib/schoolEmail.ts
// Does a school email belong to the school picked at signup? Used by the
// signup wizard (instant feedback) and the school-email APIs (the check that
// counts), so it must stay safe to import on the client.
//
// There is no fixed list of email patterns: schools use many shapes
// (unn.edu.ng, stu.unizik.edu.ng, student.oauife.edu.ng, stu.cu.edu.ng).
// Instead each school gets a few "keys" from data we already have (its
// abbreviation and its website's domain name), and the email matches when
// one part of the domain after the @ is one of those keys, followed by an
// academic ending: "edu.ng", or whatever follows that key in the school's
// own website. Anything may come before it (stu., student., live.).
// - Whole parts only, so "abu" (Ahmadu Bello) never matches "abuad.edu.ng".
// - The ending stops look-alikes anyone could set up, such as
//   "unn.example.com" or "unn.edu.ng.example.com".
import universitiesData from "@/assets/data/schoolData";

// Domain parts that say nothing about which school it is
const GENERIC_PARTS = new Set([
  "www", "edu", "ng", "com", "org", "net", "ac", "sch", "gov",
  "student", "students", "stu", "std", "mail", "email", "webmail", "portal",
]);

// Single letters would match far too much
const MIN_ABBREVIATION_LENGTH = 2;
// Nigerian university email domains end in this
const ACADEMIC_ENDING = "edu.ng";

// key -> the endings allowed after it, per school name
const KEYS_BY_SCHOOL = new Map<string, Map<string, Set<string>>>();

function addKey(keys: Map<string, Set<string>>, key: string, ending: string) {
  const endings = keys.get(key) ?? new Set<string>([ACADEMIC_ENDING]);
  endings.add(ending);
  keys.set(key, endings);
}

for (const u of universitiesData.universities) {
  const keys = KEYS_BY_SCHOOL.get(u.name) ?? new Map<string, Set<string>>();
  const abbreviation = u.abbreviation?.trim().toLowerCase();
  if (abbreviation && abbreviation.length >= MIN_ABBREVIATION_LENGTH && /^[a-z0-9-]+$/.test(abbreviation)) {
    addKey(keys, abbreviation, ACADEMIC_ENDING);
  }
  try {
    // "www.unizik.edu.ng" -> key "unizik", ending "edu.ng"
    const parts = new URL(u.website).hostname.toLowerCase().split(".");
    parts.forEach((part, i) => {
      if (part && !GENERIC_PARTS.has(part) && i < parts.length - 1) {
        addKey(keys, part, parts.slice(i + 1).join("."));
      }
    });
  } catch {
    // No usable website: the abbreviation alone
  }
  KEYS_BY_SCHOOL.set(u.name, keys);
}

const SCHOOL_EMAIL_REGEX = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/;

export function normaliseSchoolEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** The keys an email domain is matched against (exported for tests/scripts). */
export function schoolKeys(school: string): string[] {
  return [...(KEYS_BY_SCHOOL.get(school)?.keys() ?? [])];
}

export type SchoolEmailCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "unknown_school" | "mismatch" };

/** Checks that `value` is an email address at `school` (by name). */
export function checkSchoolEmail(value: string, school: string): SchoolEmailCheck {
  const email = normaliseSchoolEmail(value);
  if (email.length > 254 || !SCHOOL_EMAIL_REGEX.test(email)) return { ok: false, reason: "invalid" };
  const keys = KEYS_BY_SCHOOL.get(school);
  if (!keys || keys.size === 0) return { ok: false, reason: "unknown_school" };
  const domainParts = email.slice(email.lastIndexOf("@") + 1).split(".");
  const matches = domainParts.some((part, i) =>
    keys.get(part)?.has(domainParts.slice(i + 1).join(".")),
  );
  return matches
    ? { ok: true, email }
    : { ok: false, reason: "mismatch" };
}

/** A message for a failed check, naming the school when it helps. */
export function schoolEmailError(check: Exclude<SchoolEmailCheck, { ok: true }>, school: string): string {
  switch (check.reason) {
    case "invalid":
      return "Enter a valid email address.";
    case "unknown_school":
      return "Pick your institution on the Profile step first.";
    case "mismatch":
      return `This doesn't look like a ${school} email. Use the address your school gave you.`;
  }
}
