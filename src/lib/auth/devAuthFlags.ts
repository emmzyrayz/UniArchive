// src/lib/auth/devAuthFlags.ts
// When dev mode is on (see lib/auth/devAuth.ts). No imports, so the proxy
// can use it without pulling in the database code.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** The account dev mode signs in as, or null when dev mode is off. */
export function devAuthUpid(): string | null {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL) return null;
  return process.env.DEV_USER_UPID?.trim() || null;
}

/** Whether a Host header (e.g. "localhost:3000") is this machine. */
export function isLocalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return LOCAL_HOSTS.has(name.toLowerCase());
}

/** Dev mode is on for a request with this Host header. */
export function devAuthActive(host: string | null | undefined): boolean {
  return devAuthUpid() !== null && isLocalHost(host);
}
