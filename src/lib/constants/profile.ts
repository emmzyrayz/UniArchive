// src/lib/constants/profile.ts
// Profile field rules shared by the profile API route and the profile pages,
// so the client and server accept exactly the same values.

export const PROFILE_LEVELS = [
  "100L",
  "200L",
  "300L",
  "400L",
  "500L",
  "PG",
  "Staff",
] as const;
export type ProfileLevel = (typeof PROFILE_LEVELS)[number];

export const PROFILE_SEMESTERS = ["First", "Second"] as const;
export type ProfileSemester = (typeof PROFILE_SEMESTERS)[number];

export const PROFILE_NAME_MAX_LENGTH = 50;
export const PROFILE_BIO_MAX_LENGTH = 200;
export const PROFILE_MIN_AGE_YEARS = 16;

/** Shown wherever a phone number is displayed; the real number never is. */
export const MASKED_PHONE = "+234 ●●● ●●●●";

/**
 * Normalises a Nigerian mobile number to "+234XXXXXXXXXX". Accepts
 * "0XXXXXXXXXX", "+234XXXXXXXXXX", "234XXXXXXXXXX" or the bare 10 digits,
 * with spaces, dashes or brackets. Returns null when it isn't valid.
 */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const match = /^(?:\+?234|0)?([789]\d{9})$/.exec(digits);
  return match ? `+234${match[1]}` : null;
}

/** Error message for a date of birth, or null when it's acceptable. */
export function validateDob(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Enter a valid date.";
  const now = new Date();
  if (date > now) return "Date of birth cannot be in the future.";
  const latest = new Date(now);
  latest.setFullYear(now.getFullYear() - PROFILE_MIN_AGE_YEARS);
  if (date > latest) return `You must be at least ${PROFILE_MIN_AGE_YEARS} years old.`;
  return null;
}

// Role progression thresholds shown on the profile page.
export const COLLABORATOR_MATERIALS_REQUIRED = 5;
export const AUDITOR_MATERIALS_REQUIRED = 15;
export const AUDITOR_MIN_MONTHS_AS_COLLABORATOR = 2;
