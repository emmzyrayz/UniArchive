// src/lib/adminApi.ts
// Small helpers shared by the /api/admin/* route handlers.
import { NextResponse } from "next/server";

const MAX_LIMIT = 50;

export const fail = (status: number, message: string) =>
  NextResponse.json({ message }, { status });

export function positiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** page / limit (default 20, max 50) / skip from the query string. */
export function pagination(params: URLSearchParams, defaultLimit = 20) {
  const page = positiveInt(params.get("page"), 1);
  const limit = Math.min(positiveInt(params.get("limit"), defaultLimit), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

export const totalPages = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));

/** MongoDB's duplicate key error (a unique index rejected the write). */
export const isDuplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

/**
 * A trimmed string field from a JSON body: undefined when absent, null when
 * present but not a string or longer than `max` (a 400 for the caller).
 */
export function optionalString(value: unknown, max: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}
