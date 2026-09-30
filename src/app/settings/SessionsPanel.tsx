// app/settings/SessionsPanel.tsx
// Privacy tab: the devices currently signed in (device, IP, location, last
// active) with per-device sign-out, "sign out other devices", "sign out all
// devices", and the recent login history. Backed by /api/auth/sessions.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuMapPin, LuMonitor, LuSmartphone, LuTablet } from "react-icons/lu";
import { Button } from "@/components/UI/Buttons";
import { useUser } from "@/context/userContext";

type DeviceType = "mobile" | "tablet" | "desktop";

interface ActiveSession {
  id: string;
  device: string;
  deviceType: DeviceType;
  ipAddress: string;
  location: string | null;
  signedInAt: string;
  lastActiveAt: string;
  current: boolean;
}

interface LoginEntry {
  id: string;
  method: "password" | "google";
  viaEmailCode: boolean;
  device: string;
  deviceType: DeviceType;
  ipAddress: string;
  location: string | null;
  at: string;
  stillSignedIn: boolean;
}

interface SessionsResponse {
  sessions: ActiveSession[];
  history: LoginEntry[];
}

const DEVICE_ICONS = { mobile: LuSmartphone, tablet: LuTablet, desktop: LuMonitor };

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function methodLabel(entry: LoginEntry): string {
  const base = entry.method === "google" ? "Google" : "Password";
  return entry.viaEmailCode ? `${base} + email code` : base;
}

function Where({ ipAddress, location }: { ipAddress: string; location: string | null }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
      {location && (
        <>
          <LuMapPin aria-hidden className="h-3 w-3" />
          <span>{location}</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span>IP {ipAddress}</span>
    </p>
  );
}

async function fetchSessions(): Promise<SessionsResponse> {
  const response = await fetch("/api/auth/sessions", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`sessions: ${response.status}`);
  return (await response.json()) as SessionsResponse;
}

export function SessionsPanel() {
  const router = useRouter();
  const { clearUserData } = useUser();
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchSessions());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSessions()
      .then((sessions) => {
        if (!cancelled) setData(sessions);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const revoke = async (url: string, key: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch(url, { method: "DELETE", credentials: "same-origin" });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        signedOut?: number;
        current?: boolean;
      };
      if (!response.ok) {
        setMessage({ text: body.message ?? "Something went wrong. Please try again.", ok: false });
        return null;
      }
      return body;
    } catch {
      setMessage({ text: "Can't reach the server. Check your connection.", ok: false });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const signedOutHere = () => {
    clearUserData();
    router.push("/auth?view=signin");
  };

  const signOutOne = async (session: ActiveSession) => {
    const body = await revoke(`/api/auth/sessions/${session.id}`, session.id);
    if (!body) return;
    if (body.current) return signedOutHere();
    setMessage({ text: `Signed out ${session.device}.`, ok: true });
    await load();
  };

  const signOutOthers = async () => {
    const body = await revoke("/api/auth/sessions?scope=others", "others");
    if (!body) return;
    const n = body.signedOut ?? 0;
    setMessage({
      text: n === 0 ? "No other devices were signed in." : `Signed out ${n} other device${n === 1 ? "" : "s"}.`,
      ok: true,
    });
    await load();
  };

  const signOutAll = async () => {
    const body = await revoke("/api/auth/sessions?scope=all", "all");
    setConfirmAll(false);
    if (body) signedOutHere();
  };

  const others = data?.sessions.filter((s) => !s.current) ?? [];

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="font-semibold text-text-primary mb-2">Where you&apos;re signed in</h2>
        <p className="text-sm text-text-secondary mb-4">
          Don&apos;t recognise a device? Sign it out, then change your password.
        </p>

        {message && (
          <p
            role="status"
            className={`mb-4 rounded-md border p-3 text-sm ${
              message.ok
                ? "border-success/30 bg-success/10 text-success"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            {message.text}
          </p>
        )}

        {!data && !loadFailed && <p className="text-sm text-text-muted">Loading your devices...</p>}
        {loadFailed && (
          <p className="text-sm text-error">
            Couldn&apos;t load your devices.{" "}
            <button type="button" onClick={() => void load()} className="underline">
              Try again
            </button>
          </p>
        )}

        {data && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.sessions.map((session) => {
              const Icon = DEVICE_ICONS[session.deviceType];
              return (
                <li key={session.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Icon aria-hidden className="h-6 w-6 shrink-0 text-text-secondary" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                      {session.device}
                      {session.current && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          This device
                        </span>
                      )}
                    </p>
                    <Where ipAddress={session.ipAddress} location={session.location} />
                    <p className="text-xs text-text-muted">
                      {session.current ? "Active now" : `Last active ${timeAgo(session.lastActiveAt)}`}
                      {" · "}Signed in {dateTime.format(new Date(session.signedInAt))}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      variant="secondary"
                      onClick={() => void signOutOne(session)}
                      disabled={busy !== null}
                    >
                      {busy === session.id ? "Signing out..." : "Sign out"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void signOutOthers()}
            disabled={busy !== null || others.length === 0}
          >
            {busy === "others" ? "Signing out..." : "Sign out other devices"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-error/30 bg-error/5 p-6">
        <h2 className="font-semibold text-error mb-2">Sign out all devices</h2>
        <p className="text-sm text-text-secondary mb-4">
          If you think your account has been compromised, sign out everywhere, including
          here. Every device, even ones you&apos;ve trusted, will need an emailed code at its
          next sign-in.
        </p>
        {confirmAll ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void signOutAll()} disabled={busy !== null}>
              {busy === "all" ? "Signing out..." : "Yes, sign out everywhere"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmAll(false)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmAll(true)} disabled={busy !== null}>
            Sign out all devices
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="font-semibold text-text-primary mb-2">Login history</h2>
        <p className="text-sm text-text-secondary mb-4">
          Your recent sign-ins from the last 90 days.
        </p>
        {data && data.history.length === 0 && (
          <p className="text-sm text-text-muted">No sign-ins recorded yet.</p>
        )}
        {data && data.history.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.history.map((entry) => {
              const Icon = DEVICE_ICONS[entry.deviceType];
              return (
                <li key={entry.id} className="flex items-start gap-3 p-4">
                  <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                      {entry.device}
                      {entry.stillSignedIn && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Signed in
                        </span>
                      )}
                    </p>
                    <Where ipAddress={entry.ipAddress} location={entry.location} />
                    <p className="text-xs text-text-muted">
                      {dateTime.format(new Date(entry.at))} · {methodLabel(entry)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
