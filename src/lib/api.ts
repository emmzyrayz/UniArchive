// src/lib/api.ts
// Small helpers shared by route handlers.
import { NextResponse, type NextRequest } from "next/server";

/**
 * Converts anything thrown inside a handler into a response. Guards such as
 * requireAuth throw a ready-made Response; everything else becomes a generic
 * 500 so internal error messages never reach the client.
 */
export function handleRouteError(error: unknown, context: string): Response {
  if (error instanceof Response) return error;
  console.error(`${context}:`, error);
  return NextResponse.json(
    { message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

/** Parses a JSON body, returning null when it's missing or malformed. */
export async function readJson<T = Record<string, unknown>>(
  request: NextRequest,
): Promise<Partial<T> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort client IP. x-forwarded-for is only trustworthy behind a proxy
 * that overwrites it (e.g. Vercel); treat it as a rate-limit key, not identity.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getDeviceInfo(request: NextRequest): string {
  const ua = request.headers.get("user-agent") ?? "";
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile Device";
  if (ua.includes("Edg/")) return "Edge Browser";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Safari")) return "Safari Browser";
  return "Unknown Device";
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function asTrimmedString(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
