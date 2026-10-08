// components/notifications/notificationClient.ts
// Browser side of the notification centre: the unread count the bell polls
// (shared by every bell on the page through one store), marking read, and
// relative times. Changing the count anywhere updates every bell.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { NotificationItem } from "@/lib/notificationTypes";

const POLL_MS = 60_000;
const FIRST_POLL_MS = 2_000;

let unread = 0;
const listeners = new Set<() => void>();

function setUnread(n: number) {
  if (n === unread) return;
  unread = n;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshUnread(): Promise<void> {
  try {
    const res = await fetch("/api/notifications?count=1", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { unread: number };
    setUnread(data.unread);
  } catch {
    // Offline: next poll
  }
}

/** The unread count, polled every minute while the tab is visible. */
export function useUnreadNotifications(enabled: boolean): number {
  const count = useSyncExternalStore(subscribe, () => unread, () => 0);
  useEffect(() => {
    if (!enabled) return;
    const poll = () => {
      if (document.visibilityState !== "hidden") void refreshUnread();
    };
    // The first check always runs (the page was just opened); later ones skip hidden tabs
    const first = setTimeout(() => void refreshUnread(), FIRST_POLL_MS);
    const interval = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [enabled]);
  return enabled ? count : 0;
}

export interface NotificationPage {
  notifications: NotificationItem[];
  nextCursor: string | null;
  unread: number;
}

export async function fetchNotifications(before?: string): Promise<NotificationPage> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : "";
  const res = await fetch(`/api/notifications${qs}`, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(res.status === 401 ? "Sign in to see your notifications." : "Couldn't load notifications.");
  const page = (await res.json()) as NotificationPage;
  setUnread(page.unread);
  return page;
}

export async function markRead(target: string[] | "all"): Promise<void> {
  const res = await fetch("/api/notifications/read", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target === "all" ? { all: true } : { ids: target }),
  });
  if (res.ok) setUnread(((await res.json()) as { unread: number }).unread);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });

/** "5 minutes ago", "yesterday", or a date after a week. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return dateFormat.format(new Date(iso));
}
