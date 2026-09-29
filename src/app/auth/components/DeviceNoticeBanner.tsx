// components/auth/DeviceNoticeBanner.tsx
// Temporary notice for existing users about new-device codes. Dismissing it
// stores "device-notice-dismissed" in localStorage and hides it for good.
"use client";

import { useSyncExternalStore } from "react";

const DISMISSED_KEY = "device-notice-dismissed";
const DISMISS_EVENT = "device-notice-dismissed-change";

// Used when localStorage is blocked, so a dismissal lasts until reload
let memoryDismissed = false;

function isDismissed(): boolean {
  try {
    return memoryDismissed || localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return memoryDismissed;
  }
}

function dismiss() {
  memoryDismissed = true;
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage blocked; the in-memory flag covers this page session
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

export function DeviceNoticeBanner() {
  // Hidden on the server render, so dismissed users never see it flash
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-text-primary"
    >
      <span aria-hidden className="shrink-0">
        🔒
      </span>
      <p className="flex-1">
        <span className="font-semibold">New:</span> We&apos;ve added device verification.
        You&apos;ll receive a one-time code by email on your first sign-in from each device.
        After that, recognised devices sign in instantly.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="-m-1 shrink-0 rounded p-1 text-text-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
