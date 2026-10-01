// src/hooks/useDesktopFullscreen.ts
// Gate for the staff verify workspace: it only runs on a computer, in
// fullscreen. This is a usability rule (a PDF beside a long form needs a big
// screen), not security: the APIs check permissions either way.
//
// "A computer" means: a precise primary pointer (mouse or trackpad), a
// screen at least 1280x720, and not a tablet. Tablets in "desktop site" mode
// pretend to be desktops, so they're caught by their touch points: an iPad
// reports itself as a Mac with touch, an Android tablet as Linux with touch.
// Touchscreen Windows and ChromeOS laptops still count as computers.
import { useCallback, useSyncExternalStore, type RefObject } from "react";

const MIN_SCREEN_WIDTH = 1280;
const MIN_SCREEN_HEIGHT = 720;

function detectDesktop(): boolean {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ua = navigator.userAgent;
  const touch = navigator.maxTouchPoints > 0;
  const mobileUa = /Android|iPad|iPhone|iPod|Mobile|Silk|Kindle/i.test(ua);
  const tabletPosingAsDesktop = touch && (/Macintosh/.test(ua) || /Linux/.test(ua));
  const bigScreen = window.screen.width >= MIN_SCREEN_WIDTH && window.screen.height >= MIN_SCREEN_HEIGHT;
  return finePointer && !mobileUa && !tabletPosingAsDesktop && bigScreen;
}

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia("(hover: hover) and (pointer: fine)");
  query.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const noopSubscribe = () => () => {};

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

export function useDesktopFullscreen(target: RefObject<HTMLElement | null>) {
  const isDesktop = useSyncExternalStore(subscribeDesktop, detectDesktop, () => false);
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => !!document.fullscreenElement && document.fullscreenElement === target.current,
    () => false,
  );
  // Assumed supported while server rendering; corrected on the client
  const supported = useSyncExternalStore(noopSubscribe, () => !!document.fullscreenEnabled, () => true);

  /** Must be called from a click (browsers only allow fullscreen from a user gesture). */
  const enterFullscreen = useCallback(async (): Promise<boolean> => {
    const el = target.current;
    if (!el?.requestFullscreen) return false;
    try {
      await el.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch {
      return false;
    }
  }, [target]);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  return {
    isDesktop,
    isFullscreen,
    supported,
    enterFullscreen,
    exitFullscreen,
  };
}
