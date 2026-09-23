// src/hooks/useIsClient.ts
// false during server rendering and hydration, true afterwards. Use it to
// defer browser-only work (e.g. DOMPurify) without a hydration mismatch.
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
