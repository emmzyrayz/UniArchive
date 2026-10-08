// components/notifications/NotificationBell.tsx
// The navbar bell with the unread count. On computers (xl) it opens a
// dropdown of the latest notifications; on phones and tablets it links to
// /notifications.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { FiBell } from "react-icons/fi";
import { NotificationList } from "./NotificationList";
import { useUnreadNotifications } from "./notificationClient";

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const unread = useUnreadNotifications(enabled);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!enabled) return null;
  const label = unread > 0 ? `Notifications (${unread} unread)` : "Notifications";

  return (
    <>
      <Link href="/notifications" aria-label={label} className="relative flex text-white/80 transition-colors hover:text-white xl:hidden">
        <FiBell className="h-5 w-5" />
        <Count n={unread} />
      </Link>
      <div ref={ref} className="relative hidden xl:block">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={label}
          aria-expanded={open}
          className="relative flex text-white/80 transition-colors hover:text-white"
        >
          <FiBell className="h-5 w-5" />
          <Count n={unread} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-3 w-96 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-md"
            >
              <div className="max-h-[70vh] overflow-y-auto">
                <NotificationList tone="dark" onNavigate={() => setOpen(false)} />
              </div>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block border-t border-white/10 px-4 py-2.5 text-center text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                See all notifications
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
