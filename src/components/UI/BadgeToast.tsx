// components/UI/BadgeToast.tsx
// "Badge unlocked!" notifications. While signed in, polls
// /api/user/badges/new every minute (skipping hidden tabs) and shows each
// new badge in turn: 6 seconds each, a second apart. × closes it; clicking
// it opens /profile, where badges are listed.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FiX } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import type { EarnedBadge } from "@/lib/constants/badges";

const POLL_MS = 60_000;
// Let the page settle before the first check
const FIRST_POLL_MS = 3_000;
const SHOW_MS = 6_000;
const GAP_MS = 1_000;

export function BadgeToast() {
  const router = useRouter();
  const { hasActiveSession } = useUser();
  const [queue, setQueue] = useState<EarnedBadge[]>([]);
  const [phase, setPhase] = useState<"showing" | "gap">("showing");

  // Poll for newly earned badges
  useEffect(() => {
    if (!hasActiveSession) return;
    let cancelled = false;
    const poll = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/user/badges/new", { credentials: "same-origin", cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ badges: EarnedBadge[] }>) : null))
        .then((data) => {
          if (!cancelled && data?.badges.length) setQueue((q) => [...q, ...data.badges]);
        })
        .catch(() => {
          // Offline or signed out meanwhile: try again next time
        });
    };
    const first = setTimeout(poll, FIRST_POLL_MS);
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [hasActiveSession]);

  const current = queue[0];

  // Show for SHOW_MS, then a GAP_MS pause before the next one
  useEffect(() => {
    if (!current) return;
    const timer =
      phase === "showing"
        ? setTimeout(() => setPhase("gap"), SHOW_MS)
        : setTimeout(() => {
            setQueue((q) => q.slice(1));
            setPhase("showing");
          }, GAP_MS);
    return () => clearTimeout(timer);
  }, [current, phase]);

  const dismiss = () => setPhase("gap");

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex justify-center md:inset-x-auto md:bottom-6 md:right-6"
    >
      <AnimatePresence>
        {current && phase === "showing" && (
          <motion.div
            key={current.badgeId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto relative w-full max-w-sm cursor-pointer rounded-xl border border-amber-300/50 bg-surface-raised p-4 pr-10 shadow-2xl"
            role="status"
            onClick={() => {
              dismiss();
              router.push("/profile");
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none" aria-hidden>
                {current.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Badge unlocked!
                </p>
                <p className="mt-0.5 font-semibold text-text-primary">{current.name}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{current.description}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="absolute right-3 top-3 text-text-muted hover:text-text-primary"
            >
              <FiX aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
