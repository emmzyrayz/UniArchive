// src/components/profile/ProfileCompletionModal.tsx
// Nudges signed-in users with an incomplete profile to finish it. Mounted
// once in the root layout; reads profileCompletion from the UserContext.
// "Remind me in 7 days" (also ×, backdrop, Escape) snoozes it via localStorage.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FiCircle, FiClipboard, FiX } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { CompletionBar, completionColor } from "@/components/profile/profileUi";

const DISMISSED_KEY = "profile-modal-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 3;
const HIDDEN_PREFIXES = ["/profile", "/auth", "/read", "/unilibrary"];
const DISMISS_EVENT = "profile-modal-dismissed-change";

// --- localStorage as an external store (storage can throw when blocked) ---
// Used when localStorage is unavailable, so a dismissal lasts until reload.
let memoryDismissedAt: string | null = null;

function readDismissedAt(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY) ?? memoryDismissedAt;
  } catch {
    return memoryDismissedAt;
  }
}

function snooze() {
  const now = Date.now().toString();
  memoryDismissedAt = now;
  try {
    localStorage.setItem(DISMISSED_KEY, now);
  } catch {
    // Storage blocked — the in-memory value covers this page session
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}
function subscribeDismissed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

// --- viewport: bottom sheet on mobile, centred dialog from sm up ---
const DESKTOP_QUERY = "(min-width: 640px)";
function subscribeViewport(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function shouldShowModal(
  percentage: number,
  pathname: string,
  hasActiveSession: boolean,
  dismissedAt: string | null,
): boolean {
  if (!hasActiveSession) return false;
  if (percentage >= 100) return false;
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (dismissedAt) {
    const at = parseInt(dismissedAt, 10);
    if (Number.isFinite(at) && Date.now() - at < SNOOZE_MS) return false;
  }
  return true;
}

function copyFor(percentage: number): { title: string; body: string } {
  if (percentage >= 80) {
    return {
      title: "Just a few more steps",
      body: "You're so close! Complete your profile to unlock the ability to submit materials to the UniLibrary.",
    };
  }
  if (percentage >= 50) {
    return {
      title: "Almost there!",
      body: "You're halfway done. A complete profile unlocks material submissions and role progression.",
    };
  }
  return {
    title: "Get started on UniArchive",
    body: "Complete your profile to unlock all features like uploading materials and joining the community.",
  };
}

export default function ProfileCompletionModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasActiveSession, profileCompletion } = useUser();
  // Closed for this page session (e.g. after "Complete Profile")
  const [closed, setClosed] = useState(false);

  const dismissedAt = useSyncExternalStore(subscribeDismissed, readDismissedAt, () => null);
  const isDesktop = useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );

  const percentage = profileCompletion?.percentage ?? 100;
  const open =
    !closed &&
    !!profileCompletion &&
    shouldShowModal(percentage, pathname, hasActiveSession, dismissedAt);

  const completeProfile = () => {
    setClosed(true);
    router.push("/profile/edit");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") snooze();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const missing = [...(profileCompletion?.checks ?? [])]
    .filter((c) => !c.met)
    .sort((a, b) => b.weight - a.weight);
  const shown = missing.slice(0, MAX_ITEMS);
  const { title, body } = copyFor(percentage);

  const panelMotion = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 10 },
      }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return (
    <AnimatePresence>
      {open && (
        <div key="profile-modal" className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={snooze}
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            {...panelMotion}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8 sm:pb-6"
          >
            <button
              type="button"
              onClick={snooze}
              aria-label="Close and remind me in 7 days"
              className="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <FiX />
            </button>

            <div className="flex items-center gap-2 mb-3 pr-8">
              <FiClipboard className="text-primary shrink-0" />
              <p className="text-sm font-medium text-text-secondary">
                Profile{" "}
                <span className={`font-bold ${completionColor(percentage).text}`}>
                  {percentage}%
                </span>{" "}
                Complete
              </p>
            </div>
            <CompletionBar percentage={percentage} />

            <h2 id="profile-modal-title" className="text-lg font-bold text-text-primary mt-5">
              {title}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{body}</p>

            {shown.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-2">
                  Missing
                </p>
                <ul className="space-y-2">
                  {shown.map((check) => (
                    <li key={check.key} className="flex items-center gap-2 text-sm text-text-primary">
                      <FiCircle className="text-text-muted shrink-0" size={14} />
                      {check.label}
                      <span className="text-xs text-text-muted">({check.weight}%)</span>
                    </li>
                  ))}
                </ul>
                {missing.length > MAX_ITEMS && (
                  <p className="text-xs text-text-muted mt-2">
                    and {missing.length - MAX_ITEMS} more
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={completeProfile}
                className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Complete Profile
              </button>
              <button
                type="button"
                onClick={snooze}
                className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Remind me in 7 days
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
