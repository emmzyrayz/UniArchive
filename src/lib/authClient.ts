// src/lib/authClient.ts
// Browser-side helper for calling the /api/auth/* routes.
import { signIn } from "next-auth/react";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { message?: string; errors?: Record<string, string> };
}

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    // Network failure: surface it as a 0 status with a readable message
    return {
      ok: false,
      status: 0,
      data: { message: "Can't reach the server. Check your connection." } as ApiResult<T>["data"],
    };
  }
}

/** A user-facing message for a failed call. */
export function errorMessage(
  result: ApiResult<unknown>,
  fallback = "Something went wrong. Please try again.",
): string {
  if (result.status === 429) {
    return result.data.message ?? "Too many attempts. Please wait a minute and try again.";
  }
  return result.data.message ?? fallback;
}

// The reset token from verify-reset-code is handed to the reset-password
// screen through sessionStorage, so it never appears in the URL or history.
const RESET_KEY = "ua-reset-session";

export function storeResetSession(resetToken: string, email: string): void {
  try {
    sessionStorage.setItem(RESET_KEY, JSON.stringify({ resetToken, email }));
  } catch {
    // Storage blocked (private mode); the reset page will ask to start again
  }
}

export function readResetSession(): { resetToken: string; email: string } | null {
  try {
    const raw = sessionStorage.getItem(RESET_KEY);
    return raw ? (JSON.parse(raw) as { resetToken: string; email: string }) : null;
  } catch {
    return null;
  }
}

export function clearResetSession(): void {
  try {
    sessionStorage.removeItem(RESET_KEY);
  } catch {
    // ignore
  }
}

/**
 * Starts Google sign-in (Auth.js). Google users land on
 * /api/auth/social-callback, which starts a normal session and redirects to
 * `from` (checked server-side) or /home.
 */
export function signInWithGoogle(from?: string): Promise<void> {
  const query = from ? `?${new URLSearchParams({ from })}` : "";
  return signIn("google", { redirectTo: `/api/auth/social-callback${query}` });
}

/**
 * Links a Google account to the signed-in user, or swaps the linked one.
 * Comes back to the privacy tab of /settings.
 */
export function connectGoogle(): Promise<void> {
  return signIn("google", { redirectTo: "/api/auth/social-callback?intent=connect" });
}
