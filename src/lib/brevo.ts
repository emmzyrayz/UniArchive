// src/lib/brevo.ts
// Minimal Brevo API client for bulk email (broadcasts). Transactional email
// stays on ZeptoMail (lib/mailConfig.ts): ZeptoMail's terms forbid bulk mail.
//
//   BREVO_API_KEY    the API key (server only)
//   BREVO_API_URL    optional, defaults to https://api.brevo.com/v3 (tests
//                    point it at a local fake)
const DEFAULT_URL = "https://api.brevo.com/v3";
const TIMEOUT_MS = 15_000;

export class BrevoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BrevoError";
  }
}

export function brevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY?.trim();
}

/** One Brevo API call; throws BrevoError with Brevo's message on failure. */
export async function brevoRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) throw new BrevoError("BREVO_API_KEY is not set", 503);
  const base = (process.env.BREVO_API_URL?.trim() || DEFAULT_URL).replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "api-key": key,
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    if (res.ok) throw new BrevoError(`Brevo ${method} ${path}: response wasn't JSON`, 502);
  }
  if (!res.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new BrevoError(`Brevo ${method} ${path}: ${message}`, res.status);
  }
  return data as T;
}

/** Lifts Brevo's block on an address (the user opted back in). */
export async function unblockBrevoContact(email: string): Promise<void> {
  try {
    await brevoRequest("PUT", `/contacts/${encodeURIComponent(email)}`, { emailBlacklisted: false });
  } catch (error) {
    // Not a Brevo contact yet: nothing is blocked
    if (error instanceof BrevoError && error.status === 404) return;
    throw error;
  }
}
