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

function getIsIos(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(navigator as NavigatorWithStandalone).standalone
  );
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  // Lazy initializer runs only on client — avoids the effect setState entirely
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  });
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      // Handler is a callback from an external event — setState here is correct
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isInstalled]);

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

  const isIos = getIsIos();
  const canInstall = !isInstalled && (!!installPrompt || isIos);

  return { canInstall, isInstalled, isInstalling, isIos, install };
}
