// components/notifications/NotificationList.tsx
// The list of notifications, used by the navbar's dropdown (tone "dark",
// first page only) and /notifications (tone "page", with "Load more").
// Opening one marks it read; "Mark all as read" clears the rest.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NotificationItem } from "@/lib/notificationTypes";
import { fetchNotifications, markRead, timeAgo } from "./notificationClient";

type Tone = "dark" | "page";

const STYLES: Record<Tone, Record<string, string>> = {
  dark: {
    head: "border-b border-white/10 px-4 py-3",
    title: "text-sm font-semibold text-white",
    action: "text-xs font-medium text-primary hover:underline disabled:opacity-50",
    item: "flex gap-3 px-4 py-3 transition-colors hover:bg-white/10",
    unread: "bg-white/5",
    itemTitle: "text-sm text-white",
    body: "mt-0.5 line-clamp-2 text-xs text-white/60",
    time: "mt-1 text-[11px] text-white/40",
    empty: "px-4 py-8 text-center text-sm text-white/50",
    divider: "divide-y divide-white/5",
  },
  page: {
    head: "mb-4",
    title: "text-2xl font-bold text-text-primary sm:text-3xl",
    action: "text-sm font-medium text-primary hover:underline disabled:opacity-50",
    item: "flex gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface-raised",
    unread: "bg-primary/5",
    itemTitle: "text-sm text-text-primary sm:text-base",
    body: "mt-0.5 text-sm text-text-secondary",
    time: "mt-1 text-xs text-text-muted",
    empty: "rounded-2xl border border-dashed border-border p-10 text-center text-sm text-text-muted",
    divider: "space-y-1",
  },
};

export function NotificationList({ tone, onNavigate }: { tone: Tone; onNavigate?: () => void }) {
  const s = STYLES[tone];
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((page) => {
        if (cancelled) return;
        setItems(page.notifications);
        setCursor(page.nextCursor);
        setLoadedAt(Date.now());
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = () => {
    if (!cursor) return;
    setBusy(true);
    fetchNotifications(cursor)
      .then((page) => {
        setItems((prev) => [...(prev ?? []), ...page.notifications]);
        setCursor(page.nextCursor);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const open = (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      void markRead([n.id]);
    }
    onNavigate?.();
  };

  const markAll = () => {
    setBusy(true);
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
    markRead("all").finally(() => setBusy(false));
  };

  const hasUnread = items?.some((n) => !n.read) ?? false;

  return (
    <div>
      <div className={`flex items-center justify-between gap-3 ${s.head}`}>
        {tone === "page" ? <h1 className={s.title}>Notifications</h1> : <p className={s.title}>Notifications</p>}
        {hasUnread && (
          <button type="button" onClick={markAll} disabled={busy} className={s.action}>
            Mark all as read
          </button>
        )}
      </div>

      {error && <p className={s.empty}>{error}</p>}
      {!error && items === null && <p className={s.empty}>Loading…</p>}
      {!error && items?.length === 0 && (
        <p className={s.empty}>Nothing yet. We&apos;ll let you know when your work is verified or you earn a badge.</p>
      )}

      {items && items.length > 0 && (
        <ul className={s.divider}>
          {items.map((n) => {
            const inner = (
              <>
                <span aria-hidden className="text-lg leading-6">
                  {n.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${s.itemTitle} ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
                  {n.body && <span className={`block ${s.body}`}>{n.body}</span>}
                  <span className={`block ${s.time}`}>{timeAgo(n.createdAt, loadedAt)}</span>
                </span>
                {!n.read && <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </>
            );
            const cls = `${s.item} ${n.read ? "" : s.unread}`;
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} onClick={() => open(n)} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={() => open(n)} className={`w-full text-left ${cls}`}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tone === "page" && cursor && (
        <div className="mt-4 text-center">
          <button type="button" onClick={loadMore} disabled={busy} className={s.action}>
            {busy ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
