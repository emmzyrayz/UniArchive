// components/admin/reviewShared.ts
// Helpers shared by the admin submissions table, drawer and modals.
import { CATEGORIES } from "@/lib/constants/materialCategories";
import type { AdminSubmissionDto } from "@/lib/adminSubmissions";

export type { AdminSubmissionDto };

export type ReviewStatus = "submitted" | "in_review" | "verified" | "rejected";
export const REVIEW_TABS: { status: ReviewStatus; label: string }[] = [
  { status: "submitted", label: "Submitted" },
  { status: "in_review", label: "In Review" },
  { status: "verified", label: "Verified" },
  { status: "rejected", label: "Rejected" },
];

export interface Viewer {
  userId: string;
  upid: string;
  canReview: boolean;
  canVerifyTier1: boolean;
  canVerifyTier2: boolean;
  canReject: boolean;
}

export function isDecidable(status: AdminSubmissionDto["status"]): boolean {
  return status === "submitted" || status === "in_review";
}

export function canEndorse(s: AdminSubmissionDto, viewer: Viewer): boolean {
  return (
    viewer.canVerifyTier2 &&
    s.status === "verified" &&
    s.verificationTier !== "tier2" &&
    s.submittedBy.id !== viewer.userId
  );
}

/** "Past Question" when there's a subcategory, else the category label. */
export function categoryLabel(category: string, subcategory?: string): string {
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return category;
  const sub = subcategory ? cat.subcategories.find((s) => s.id === subcategory) : undefined;
  return sub?.label ?? cat.label;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [
    [86400 * 365, "year"],
    [86400 * 30, "month"],
    [86400 * 7, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

/**
 * Calls a reviewer API route and returns the parsed JSON, or throws an Error
 * carrying the server's message.
 */
export async function reviewRequest<T>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed (HTTP ${res.status}).`);
  }
  return data as T;
}
