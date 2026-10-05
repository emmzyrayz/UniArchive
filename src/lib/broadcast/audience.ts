// src/lib/broadcast/audience.ts
// Who a broadcast goes to. Unlike diuscadi's one-audience-type-at-a-time,
// the criteria stack (all must match): e.g. one school + 100 level for an
// exam-season email. No criteria = everyone. On top of these, only verified,
// unsuspended accounts that accept the broadcast's kind of email are ever
// included (lib/broadcast/recipients.ts). Client-safe: the editor uses it.
import { roleHierarchy, type UserRole } from "@/types/roles";

export interface BroadcastAudience {
  /** School names, as users hold them (universityName, or the signup school) */
  schools: string[];
  departmentIds: string[];
  levels: string[];
  roles: UserRole[];
  /** At least one verified material in the UniLibrary */
  contributorsOnly: boolean;
  /** Confirmed a school email at signup */
  verifiedStudentsOnly: boolean;
  /** Profile below 100% */
  incompleteProfileOnly: boolean;
  /** No sign-in or activity for this many days (7-90) */
  inactiveDays: number | null;
  /** Joined on or after / on or before (YYYY-MM-DD, inclusive) */
  joinedFrom: string | null;
  joinedTo: string | null;
}

export const EMPTY_AUDIENCE: BroadcastAudience = {
  schools: [],
  departmentIds: [],
  levels: [],
  roles: [],
  contributorsOnly: false,
  verifiedStudentsOnly: false,
  incompleteProfileOnly: false,
  inactiveDays: null,
  joinedFrom: null,
  joinedTo: null,
};

// Sign-in history is kept 90 days (LoginEvent), so "inactive" can't look further
export const INACTIVE_DAYS = { min: 7, max: 90 } as const;

const MAX_ITEMS = 50;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OBJECT_ID = /^[a-f0-9]{24}$/;

function strings(value: unknown, max = 200): string[] {
  if (!Array.isArray(value)) return [];
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, max))
    .filter(Boolean);
  return [...new Set(out)].slice(0, MAX_ITEMS);
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value;
}

/** Cleans raw input; `problems` lists what would make it unusable. */
export function cleanAudience(raw: unknown): { audience: BroadcastAudience; problems: string[] } {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const problems: string[] = [];
  let inactiveDays: number | null = null;
  if (input.inactiveDays !== null && input.inactiveDays !== undefined && input.inactiveDays !== "") {
    const n = Number(input.inactiveDays);
    if (Number.isInteger(n) && n >= INACTIVE_DAYS.min && n <= INACTIVE_DAYS.max) inactiveDays = n;
    else problems.push(`"Inactive for" must be ${INACTIVE_DAYS.min}-${INACTIVE_DAYS.max} days.`);
  }
  const audience: BroadcastAudience = {
    schools: strings(input.schools),
    departmentIds: strings(input.departmentIds, 24).filter((id) => OBJECT_ID.test(id)),
    levels: strings(input.levels, 20),
    roles: strings(input.roles, 30).filter((r): r is UserRole => r in roleHierarchy),
    contributorsOnly: input.contributorsOnly === true,
    verifiedStudentsOnly: input.verifiedStudentsOnly === true,
    incompleteProfileOnly: input.incompleteProfileOnly === true,
    inactiveDays,
    joinedFrom: validDate(input.joinedFrom),
    joinedTo: validDate(input.joinedTo),
  };
  if (audience.joinedFrom && audience.joinedTo && audience.joinedFrom > audience.joinedTo) {
    problems.push("The joined-from date is after the joined-to date.");
  }
  return { audience, problems };
}

/** A one-line summary for lists and the review step. */
export function describeAudience(a: BroadcastAudience, departmentNames: Record<string, string> = {}): string {
  const parts: string[] = [];
  if (a.schools.length) parts.push(a.schools.join(" or "));
  if (a.departmentIds.length) parts.push(a.departmentIds.map((id) => departmentNames[id] ?? "a department").join(" or "));
  if (a.levels.length) parts.push(`level ${a.levels.join("/")}`);
  if (a.roles.length) parts.push(a.roles.join("/"));
  if (a.contributorsOnly) parts.push("contributors");
  if (a.verifiedStudentsOnly) parts.push("verified students");
  if (a.incompleteProfileOnly) parts.push("incomplete profiles");
  if (a.inactiveDays) parts.push(`inactive ${a.inactiveDays}+ days`);
  if (a.joinedFrom || a.joinedTo) parts.push(`joined ${a.joinedFrom ?? "…"} to ${a.joinedTo ?? "…"}`);
  return parts.length ? parts.join(" · ") : "Everyone";
}
