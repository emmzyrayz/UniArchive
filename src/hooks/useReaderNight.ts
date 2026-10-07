// src/hooks/useReaderNight.ts
// Night mode for PDF pages: the reader's own setting (the site's dark theme
// doesn't reach the page canvas). Remembered on this device; the toolbar
// toggles it and every reader view reads it.
import { useCallback, useSyncExternalStore } from "react";

const KEY = "ua_reader_night";
const EVENT = "ua-reader-night";

// Used when storage is blocked: the setting lasts until the page reloads
let fallback = false;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** [on, toggle]; off on the server and until hydrated. */
export function useReaderNight(): [boolean, () => void] {
  const night = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    const next = !read();
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      fallback = next;
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [night, toggle];
}
