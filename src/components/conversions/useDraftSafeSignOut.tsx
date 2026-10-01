// src/components/conversions/useDraftSafeSignOut.tsx
// Signing out clears this user's conversion drafts from the device (they're
// on the server once synced). Drafts that haven't synced yet would be lost,
// so sign-out first tries to sync them and, if some still can't be, asks
// before deleting them.
"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FiAlertTriangle } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { clearLocalDrafts, unsyncedDrafts } from "@/lib/draftSync";

/** Signs out (after the drafts check), then runs `onDone` and goes home. */
export function useDraftSafeSignOut(onDone: () => void) {
  const { logout, userProfile } = useUser();
  const router = useRouter();
  const upid = userProfile?.upid;
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unsynced, setUnsynced] = useState(0);

  const finish = async () => {
    setIsSigningOut(true);
    setUnsynced(0);
    try {
      if (upid) await clearLocalDrafts(upid);
      await logout();
    } finally {
      setIsSigningOut(false);
      onDone();
      router.push("/");
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    const left = upid ? await unsyncedDrafts(upid) : [];
    if (left.length > 0) {
      setIsSigningOut(false);
      onDone();
      setUnsynced(left.length);
      return;
    }
    await finish();
  };

  const dialog = unsynced > 0 && (
    <UnsyncedDraftsDialog
      count={unsynced}
      busy={isSigningOut}
      onCancel={() => setUnsynced(0)}
      onConfirm={() => void finish()}
    />
  );
  return { signOut, isSigningOut, dialog };
}

function UnsyncedDraftsDialog({
  count,
  busy,
  onCancel,
  onConfirm,
}: {
  count: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const items = count === 1 ? "1 conversion" : `${count} conversions`;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface-raised p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <FiAlertTriangle aria-hidden className="text-warning" /> Unsaved work on this device
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          {items} you&apos;re typing out {count === 1 ? "hasn't" : "haven't"} been saved to your account yet,
          probably because you&apos;re offline. Signing out now deletes {count === 1 ? "it" : "them"} from this device.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Stay signed in and reconnect, and {count === 1 ? "it syncs on its own" : "they sync on their own"}.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-error hover:bg-error/10 disabled:opacity-60"
          >
            {busy ? "Signing out..." : "Sign out and delete"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            autoFocus
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
