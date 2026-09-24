// src/hooks/usePwaInstall.ts
"use client";

import { useState, useEffect, startTransition } from "react";

// Extend the Navigator type to include iOS standalone and beforeinstallprompt
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // All browser checks after mount — no hydration mismatch
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as NavigatorWithStandalone).standalone;

    startTransition(() => {
      setIsInstalled(standalone);
      setIsIos(ios);
      setMounted(true);
    });

    if (standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      // Handler is a callback from an external event — setState here is correct
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      startTransition(() => {
        setIsInstalled(true);
        setInstallPrompt(null);
      });
    }
    setIsInstalling(false);
  };

  // Don't show anything until mounted — prevents hydration mismatch
  const canInstall = mounted && !isInstalled && (!!installPrompt || isIos);

  return { canInstall, isInstalled, isInstalling, isIos, install };
}
