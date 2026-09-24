// src/components/UI/PwaInstallButton.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "pwa-install-dismissed";

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PwaInstallButton() {
  const { canInstall, isInstalling, isIos, install } = usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);
  // Lasts for the browser session; a reopened tab may prompt again.
  // Only affects output after mount (canInstall is false until then).
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const pathname = usePathname();

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked (e.g. private mode) — dismiss for this page only
    }
    setDismissed(true);
  };

  // The reader has its own fixed toolbar; the banner would cover the PDF
  if (pathname.startsWith("/read")) return null;
  if (!canInstall || dismissed) return null;

  return (
    <>
      {/* iOS instruction sheet */}
      <AnimatePresence>
        {showIosSteps && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/60"
              onClick={() => setShowIosSteps(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-[91] bg-neutral-900 border-t border-neutral-700 rounded-t-2xl p-6 pb-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white text-base">
                  Install UniArchive
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIosSteps(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <CloseIcon />
                </button>
              </div>
              <ol className="space-y-4">
                {[
                  {
                    step: "1",
                    text: "Tap the Share button at the bottom of Safari",
                    note: "The box with an arrow pointing up",
                  },
                  {
                    step: "2",
                    text: 'Scroll down and tap "Add to Home Screen"',
                    note: null,
                  },
                  {
                    step: "3",
                    text: 'Tap "Add" in the top right corner',
                    note: "UniArchive will appear on your home screen",
                  },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm text-white">{item.text}</p>
                      {item.note && (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Install banner */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ delay: 2, type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-20 md:bottom-6 inset-x-4 z-40 md:inset-x-auto md:right-6 md:left-auto md:w-80"
      >
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 flex items-center gap-3">
          {/* App icon placeholder */}
          <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 flex items-center justify-center text-white font-bold text-lg">
            U
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Install UniArchive
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Add to your home screen for quick access
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={isIos ? () => setShowIosSteps(true) : install}
              disabled={isInstalling}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isInstalling ? (
                "Installing…"
              ) : (
                <>
                  <DownloadIcon />
                  Install
                </>
              )}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-neutral-500 hover:text-neutral-300 p-1"
              aria-label="Dismiss"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
