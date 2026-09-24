// src/app/offline/page.tsx
"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import Link from "next/link";
import BrandLogo from "@/app/auth/components/UI/BrandLogo";

const OfflineReader = dynamic(
  () => import("@/components/reader/OfflineReader").then((mod) => mod.OfflineReader),
  { ssr: false },
);

const noopSubscribe = () => () => {};

// The service worker serves this page in place of any uncached page, so the
// address bar still holds the URL the user asked for.
function getRequestedBookId(): string | null {
  return window.location.pathname.match(/^\/read\/([^/]+)\/?$/)?.[1] ?? null;
}

export default function OfflinePage() {
  const bookId = useSyncExternalStore(noopSubscribe, getRequestedBookId, () => null);
  if (bookId) return <OfflineReader bookId={decodeURIComponent(bookId)} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <BrandLogo size={48} className="text-text-muted" />
        </div>

        <div className="text-5xl mb-4">📡</div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">You&apos;re offline</h1>
        <p className="text-text-secondary mb-8">
          No internet connection detected. Any documents you&apos;ve opened before
          are available in your cached library. Uploads will sync automatically
          when you reconnect.
        </p>

        <div className="space-y-3">
          <Link
            href="/home"
            className="block w-full py-3 px-6 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-neutral-800 transition-colors"
          >
            Open cached library
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 px-6 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition-colors font-medium"
          >
            Try again
          </button>
        </div>

        <p className="mt-8 text-xs text-text-muted">
          Tip: Open documents while online to make them available offline automatically.
        </p>
      </motion.div>
    </div>
  );
}